import { SpellMenu } from "./menu/spells"

const SURFACE = "top-panel-ability-picker"
/** How long the card takes to come up once opened, in ms. */
const REVEAL_TIME = 140
/** What the menu draws a tile at, in dp: its side, the gap between two, and the ring around one. */
const TILE_DP = 39
const TILE_GAP_DP = 5
const TILE_BORDER_DP = 1
const TILE_RADIUS_DP = 6
/** The card's own inset around the grid, in dp. */
const CARD_PAD_DP = 8
/** How far the hand travels before a press on a tile turns into a drag, in dp. */
const DRAG_THRESHOLD_DP = 4
/** How much larger a tile in hand is drawn than the slot it left. */
const DRAG_LIFT_SCALE = 1.08
/** The shadow a tile in hand drops: `0 6dp 14dp #00000040` in the menu. */
const DRAG_SHADOW_DY_DP = 6
const DRAG_SHADOW_ALPHA = 0x40
/** The ring a tile that is off shows under the hand, as a share of the accent. */
const OFF_HOVER_RING = 0.4
/** The multiply a tile that is off is drawn through, and how much of it shows, before the hand lifts it. */
const DIM_TINT = new Color(198, 198, 208)
const DIM_OPACITY = 0.7
/**
 * How far the hand lifts a tile that is off, as a share of the way from dimmed to lit: short of
 * the whole, as in the menu, so a tile under the hand still reads as off next to one that is on.
 */
const HOVER_LIFT = 0.5
const BLACK = new Color(0, 0, 0)
const CLEAR = new Color(0, 0, 0, 0)
interface PickerTarget {
	hero: Hero
	abilities: Ability[]
	anchor: Rectangle
	menu: SpellMenu
	frame: number
}

/** A tile pressed and not yet let go: a click until the hand moves, a drag from then on. */
interface Grip {
	ability: Ability
	grabX: number
	grabY: number
	originX: number
	originY: number
	active: boolean
}

/** A tile let go of after a drag, on its way back from where the hand left it to its slot. */
interface Settling {
	ability: Ability
	fromX: number
	fromY: number
	/** How far it still is from its slot, 1 under the hand down to 0 at rest. */
	along: number
	tween: MenuSDK.Tween
}

class Tile {
	public readonly box = new Rectangle()
	public ability: Nullable<Ability>
}

/**
 * What the menu animates on one of its tiles: how far the hand has lifted it, 0 to 1, and the
 * glide - the way back from where the tile stood to where the row now puts it, so a tile a drag
 * pushes aside slides over rather than jumping. The glide is an offset that fades to nothing over
 * the menu's fade duration, and a second push mid-flight starts again from wherever the tile is.
 */
class TileState {
	public readonly hover: MenuSDK.Tween
	public readonly glide: MenuSDK.Tween
	public Lift = 0
	public OffsetX = 0
	public OffsetY = 0
	/** The slot the tile stood in when it was last drawn, or none before its first draw. */
	public slot = -1
	public frame = 0
	private target = 0
	private fromX = 0
	private fromY = 0

	constructor() {
		this.hover = new MenuSDK.Tween(
			0,
			value => {
				this.Lift = value
			},
			MenuSDK.EThemeScope.Panels
		)
		this.glide = new MenuSDK.Tween(
			0,
			remaining => {
				this.OffsetX = this.fromX * remaining
				this.OffsetY = this.fromY * remaining
			},
			MenuSDK.EThemeScope.Panels
		)
	}

	public To(lifted: boolean): this {
		const target = lifted ? 1 : 0
		if (this.target === target) {
			return this
		}
		this.target = target
		if (MenuSDK.MenuFlags.HoverAnimation) {
			this.hover.To(target, MenuSDK.Duration.Hover, MenuSDK.Ease.Out)
		} else {
			this.hover.Set(target)
		}
		return this
	}

	/** Starts the tile dx, dy away from its slot and lets it settle there. */
	public Glide(dx: number, dy: number): void {
		this.fromX = this.OffsetX + dx
		this.fromY = this.OffsetY + dy
		if (this.fromX === 0 && this.fromY === 0) {
			return
		}
		this.glide.Set(1)
		this.glide.To(0, MenuSDK.Duration.Fade, MenuSDK.Ease.Out)
	}

	/** Puts the tile at its slot at once, for one the hand carries or drops. */
	public Pin(): void {
		this.glide.Cancel()
		this.fromX = 0
		this.fromY = 0
		this.OffsetX = 0
		this.OffsetY = 0
	}

	public Cancel(): void {
		this.hover.Cancel()
		this.glide.Cancel()
	}
}

/**
 * One card shared by all ten diamonds, mirroring the hero's row in the menu: the tiles stand in
 * the row's order and are drawn the way the row draws them - the accent ring on one that is on,
 * a dimmed image and a faint ring under the hand on one that is off - a click flips one the way
 * the row's tile does and a drag ranks it. Clicks outside it pass through, and the menu standing
 * open changes nothing - the menu keeps the clicks over its own window to itself before the card
 * ever hears of them.
 */
class AbilityPicker {
	private readonly canvas = new MenuSDK.Canvas(SURFACE, MenuSDK.EPanelLayer.Screen)
	private readonly surface = MenuSDK.HudSurfaceOf(SURFACE, MenuSDK.EPanelLayer.Screen)
	private readonly rect = new Rectangle()
	private readonly card = new Rectangle()
	private readonly registration = MenuSDK.OverlayManager.Register(this.rect)
	private readonly targets = new Map<Hero, PickerTarget>()
	private readonly tiles: Tile[] = []
	private tileCount = 0
	private readonly order: Ability[] = []
	private readonly states = new Map<string, TileState>()
	private readonly position = new Vector2()
	private readonly size = new Vector2()
	private readonly textBox = new Rectangle()
	private readonly tint = new Color()
	private readonly ring = new Color()
	private readonly ink = new Color()
	private readonly pressed = new Set<VMouseKeys>()
	private active: Nullable<PickerTarget>
	private grip: Nullable<Grip>
	private settling: Nullable<Settling>
	private openedAt = 0
	private frame = 0
	private drawnAt = -Infinity

	constructor() {
		EventsSDK.on("MouseKeyDown", this.mouseDown.bind(this))
		EventsSDK.on("MouseKeyUp", this.mouseUp.bind(this))
		EventsSDK.on("KeyDown", key => {
			if (key !== VKeys.ESCAPE || this.active === undefined || !this.canInput()) {
				return true
			}
			this.close()
			return false
		})
	}

	public BeginFrame(): void {
		this.frame++
		this.drawnAt = hrtime()
	}

	public Update(
		hero: Hero,
		abilities: Ability[],
		anchor: Rectangle,
		menu: SpellMenu
	): void {
		let target = this.targets.get(hero)
		if (target === undefined) {
			target = {
				hero,
				abilities,
				anchor: anchor.Clone(),
				menu,
				frame: this.frame
			}
			this.targets.set(hero, target)
		} else {
			target.abilities = abilities
			target.anchor.pos1.CopyFrom(anchor.pos1)
			target.anchor.pos2.CopyFrom(anchor.pos2)
			target.menu = menu
			target.frame = this.frame
		}
	}

	public EndFrame(): void {
		for (const [hero, candidate] of this.targets) {
			if (candidate.frame !== this.frame || !hero.IsValid) {
				this.targets.delete(hero)
				if (this.active === candidate) {
					this.close()
				}
			}
		}
		if (!this.canInput()) {
			this.close()
			return
		}
		const target = this.active
		if (target === undefined) {
			return
		}
		const selector = target.menu.SelectorOf(target.hero)
		if (selector === undefined) {
			this.close()
			return
		}
		const cursor = InputManager.CursorOnScreen
		this.drag(target, cursor)
		const order = this.order
		order.length = 0
		for (const name of selector.values) {
			const ability = this.abilityNamed(target, name)
			if (ability !== undefined) {
				order.push(ability)
			}
		}
		if (order.length === 0) {
			this.close()
			return
		}
		const now = hrtime()
		const size = Math.max(24, Math.round(MenuSDK.DpToPx(TILE_DP)))
		const gap = Math.max(3, Math.round(MenuSDK.DpToPx(TILE_GAP_DP)))
		const pad = Math.max(6, Math.round(MenuSDK.DpToPx(CARD_PAD_DP)))
		const border = Math.max(1, Math.round(MenuSDK.DpToPx(TILE_BORDER_DP)))
		const radius = Math.max(
			2,
			Math.round(MenuSDK.DpToPx(TILE_RADIUS_DP * MenuSDK.Theme.RadiusScale))
		)
		const view = RendererSDK.WindowSize
		const columns = Math.min(
			6,
			order.length,
			Math.max(1, Math.floor((view.x - pad * 2 + gap) / (size + gap)))
		)
		const rows = Math.ceil(order.length / columns)
		const width = columns * (size + gap) - gap + pad * 2
		const height = rows * (size + gap) - gap + pad * 2
		this.rect.pos1.SetVector(
			Math.clamp(
				target.anchor.Center.x - width / 2,
				0,
				Math.max(0, view.x - width)
			),
			Math.clamp(target.anchor.Bottom + gap, 0, Math.max(0, view.y - height))
		)
		this.rect.Width = width
		this.rect.Height = height
		MenuSDK.OverlayManager.Update(this.registration, now)
		const reveal = Math.min(1, (now - this.openedAt) / REVEAL_TIME)
		const presence = reveal * (2 - reveal)
		const lift = Math.round((1 - presence) * GUIInfo.ScaleHeight(6))
		this.card.pos1.SetVector(this.rect.x, this.rect.y - lift)
		this.card.pos2.SetVector(this.rect.Right, this.rect.Bottom - lift)
		this.tileCount = order.length
		const grip = this.grip
		const held = grip?.active === true ? grip.ability : undefined
		const settling = this.settling
		const step = size + gap
		for (let i = 0; i < order.length; i++) {
			const tile = this.tile(i)
			const ability = order[i]
			const x = this.rect.x + pad + (i % columns) * step
			const y = this.rect.y + pad + Math.floor(i / columns) * step
			tile.ability = ability
			tile.box.pos1.SetVector(x, y)
			tile.box.pos2.SetVector(x + size, y + size)
			// a tile the row has moved starts out where it stood and glides over, as the menu's
			// does; the one in hand and the one popping back to its slot are placed by the hand
			const state = this.stateOf(ability)
			if (ability === held || ability === settling?.ability) {
				state.Pin()
			} else if (state.slot >= 0 && state.slot !== i) {
				state.Glide(
					((state.slot % columns) - (i % columns)) * step,
					(Math.floor(state.slot / columns) - Math.floor(i / columns)) * step
				)
			}
			state.slot = i
		}
		const hovered = grip === undefined ? this.tileAt(cursor)?.ability : grip.ability
		const accent = MenuSDK.HudColorOf(MenuSDK.Theme.AccentHex)
		const title = MenuSDK.HudColors.title
		MenuSDK.setHudScale(1)
		MenuSDK.SetActiveSurface(this.surface)
		try {
			MenuSDK.HudCard.Frame(
				this.card,
				Math.round(255 * presence),
				MenuSDK.HudCardRadius
			)
			// The surface pools images by draw index. Keep both image layers in the states'
			// insertion order, including transparent placeholders, so picking up, ranking and
			// dropping a tile never changes another element's texture or grows the pool mid-drag.
			for (let layer = 0; layer < 2; layer++) {
				const floating = layer === 1
				for (const state of this.states.values()) {
					if (state.frame !== this.frame) {
						continue
					}
					const ability = order[state.slot]
					const tile = this.tiles[state.slot]
					const on = selector.IsEnabled(ability.Name)
					const hover = state.To(ability === hovered).Lift
					const carried = ability === held && grip !== undefined
					const landing = settling?.ability === ability
					const raised = carried || landing
					let x = tile.box.x + state.OffsetX
					let y = tile.box.y + state.OffsetY - lift
					let scale = 1
					let along = 0
					if (floating && carried) {
						along = 1
						scale = DRAG_LIFT_SCALE
						x = cursor.x - grip.grabX
						y = cursor.y - grip.grabY
					} else if (floating && landing) {
						along = settling.along
						scale = 1 + (DRAG_LIFT_SCALE - 1) * along
						x += settling.fromX * along
						y += settling.fromY * along
					}
					const side = size * scale
					x -= (side - size) / 2
					y -= (side - size) / 2
					if (floating && raised) {
						this.shadow(x, y, side, radius * scale, along)
					}
					this.drawTile(
						ability,
						x,
						y,
						side,
						radius * scale,
						border,
						on,
						on || floating,
						hover,
						floating === raised ? (carried ? 1 : presence) : 0,
						accent,
						title
					)
				}
			}
		} finally {
			MenuSDK.SetActiveSurface(undefined)
		}
		this.forgetStates()
	}

	public Hide(): void {
		this.targets.clear()
		this.drawnAt = -Infinity
		this.close()
	}

	private canInput(): boolean {
		return (
			hrtime() - this.drawnAt < 250 &&
			MenuSDK.HostCanDrawOverlays() &&
			!MenuSDK.HostInputCaptured()
		)
	}

	private abilityNamed(target: PickerTarget, name: string): Nullable<Ability> {
		const abilities = target.abilities
		for (let i = 0, end = abilities.length; i < end; i++) {
			const ability = abilities[i]
			if (
				ability.Name === name &&
				ability.IsValid &&
				ability.Owner === target.hero &&
				!ability.IsPassive &&
				ability.ShouldBeDrawable
			) {
				return ability
			}
		}
		return undefined
	}

	private tile(index: number): Tile {
		let tile = this.tiles[index]
		if (tile === undefined) {
			tile = new Tile()
			this.tiles.push(tile)
		}
		return tile
	}

	private tileAt(cursor: Vector2): Nullable<Tile> {
		for (let i = 0; i < this.tileCount; i++) {
			const tile = this.tiles[i]
			if (tile.box.Contains(cursor)) {
				return tile
			}
		}
		return undefined
	}

	/** The state of the ability's tile, minted the first time the tile is laid out and dated each frame. */
	private stateOf(ability: Ability): TileState {
		let state = this.states.get(ability.Name)
		if (state === undefined) {
			state = new TileState()
			this.states.set(ability.Name, state)
		}
		state.frame = this.frame
		return state
	}

	/** Drops the states of tiles the card no longer shows. */
	private forgetStates(): void {
		for (const [name, state] of this.states) {
			if (state.frame !== this.frame) {
				state.Cancel()
				this.states.delete(name)
			}
		}
	}

	/** Carries a held tile: arms the drag past the threshold, then ranks it at the nearest slot. */
	private drag(target: PickerTarget, cursor: Vector2): void {
		const grip = this.grip
		if (grip === undefined) {
			return
		}
		if (!grip.active) {
			const dx = cursor.x - grip.originX
			const dy = cursor.y - grip.originY
			const threshold = MenuSDK.DpToPx(DRAG_THRESHOLD_DP)
			if (dx * dx + dy * dy < threshold * threshold) {
				return
			}
			grip.active = true
		}
		let nearest: Nullable<Tile>
		let best = Infinity
		for (let i = 0; i < this.tileCount; i++) {
			const tile = this.tiles[i]
			const box = tile.box
			const dx = cursor.x - (box.x + box.Width / 2)
			const dy = cursor.y - (box.y + box.Height / 2)
			const distance = dx * dx + dy * dy
			if (distance < best) {
				best = distance
				nearest = tile
			}
		}
		const slot = nearest?.ability
		if (slot !== undefined && slot !== grip.ability) {
			target.menu.MoveAbility(target.hero, grip.ability, slot)
		}
	}

	/** The shadow a lifted tile drops, `along` of its full depth. */
	private shadow(
		x: number,
		y: number,
		side: number,
		radius: number,
		along: number
	): void {
		if (along <= 0) {
			return
		}
		MenuSDK.HudCard.Plate(
			x,
			y + MenuSDK.DpToPx(DRAG_SHADOW_DY_DP) * along,
			side,
			side,
			radius,
			BLACK,
			Math.round(DRAG_SHADOW_ALPHA * along)
		)
	}

	/**
	 * A tile as the menu's row draws it: the art lit in full when it is on, dimmed and lifted
	 * `lift` of the way to full under the hand when it is off; the accent ring in full when it is
	 * on, a faint one growing with the lift when it is off.
	 */
	private drawTile(
		ability: Ability,
		x: number,
		y: number,
		side: number,
		radius: number,
		border: number,
		on: boolean,
		bright: boolean,
		hover: number,
		presence: number,
		accent: Color,
		title: Color
	): void {
		const inner = Math.max(0, side - border * 2)
		const innerRadius = Math.max(0, radius - border)
		const position = this.position.SetVector(x + border, y + border)
		const size = this.size.SetVector(inner, inner)
		// a tile that is on, or in hand, is lit through; one that is off comes only part of the
		// way up under the hand, so it never passes for one that is on
		const lift = bright ? 1 : HOVER_LIFT * hover
		const opacity = DIM_OPACITY + (1 - DIM_OPACITY) * lift
		// the card's image rather than the canvas's: its corner is carved by the sdf mask and
		// carries per-pixel coverage, where the canvas's raster clip leaves stair steps
		MenuSDK.HudCard.Image(
			ability.TexturePath,
			position,
			size,
			this.tint
				.SetR(Math.round(DIM_TINT.r + (255 - DIM_TINT.r) * lift))
				.SetG(Math.round(DIM_TINT.g + (255 - DIM_TINT.g) * lift))
				.SetB(Math.round(DIM_TINT.b + (255 - DIM_TINT.b) * lift))
				.SetA(255),
			Math.round(255 * opacity * presence),
			innerRadius
		)
		if (presence === 0) {
			return
		}
		const cooldown = ability.Cooldown
		if (cooldown > 0) {
			this.canvas.Rect(position, size, {
				color: this.ink.CopyFrom(BLACK).SetA(Math.round(150 * presence)),
				radius: innerRadius
			})
			this.textBox.pos1.SetVector(x, y)
			this.textBox.pos2.SetVector(x + side, y + side)
			this.canvas.TextIn(Math.ceil(cooldown).toString(), this.textBox, {
				size: Math.round(side * 0.42),
				weight: 600,
				color: this.ink.CopyFrom(title).SetA(Math.round(255 * presence))
			})
		}
		const ringAlpha = on ? 1 : OFF_HOVER_RING * hover
		if (ringAlpha <= 0) {
			return
		}
		// the stroke sits centred on its path: half a border in from the edge keeps it inside the tile
		const half = border / 2
		this.canvas.Rect(
			this.position.SetVector(x + half, y + half),
			this.size.SetVector(side - border, side - border),
			{
				color: CLEAR,
				borderColor: this.ring
					.CopyFrom(accent)
					.SetA(Math.round(255 * ringAlpha * presence)),
				borderWidth: border,
				radius: Math.max(0, radius - half)
			}
		)
	}

	private open(target: PickerTarget): void {
		this.close()
		this.active = target
		this.openedAt = hrtime()
		this.surface.Order(MenuSDK.OverlayManager.Raise(this.registration))
	}

	private close(): void {
		this.grip = undefined
		this.settle(undefined)
		if (this.active === undefined) {
			return
		}
		this.active = undefined
		this.tileCount = 0
		for (const state of this.states.values()) {
			state.Cancel()
		}
		this.states.clear()
		this.canvas.Clear()
		MenuSDK.OverlayManager.Reset(this.registration)
	}

	/** Starts a tile on its way back to its slot, or calls the one on its way off. */
	private settle(next: Nullable<Settling>): void {
		this.settling?.tween.Cancel()
		this.settling = next
	}

	private mouseDown(key: VMouseKeys): boolean {
		if (!this.canInput()) {
			return true
		}
		const cursor = InputManager.CursorOnScreen
		const front = MenuSDK.OverlayManager.TopUnderCursor(cursor.x, cursor.y, hrtime())
		if (this.active !== undefined && front === this.registration) {
			if (key === VMouseKeys.MK_LBUTTON) {
				const tile = this.tileAt(cursor)
				if (tile?.ability !== undefined) {
					this.settle(undefined)
					this.grip = {
						ability: tile.ability,
						grabX: cursor.x - tile.box.x,
						grabY: cursor.y - tile.box.y,
						originX: cursor.x,
						originY: cursor.y,
						active: false
					}
				}
			} else if (key === VMouseKeys.MK_RBUTTON) {
				this.close()
			}
			this.pressed.add(key)
			return false
		}
		if (key === VMouseKeys.MK_LBUTTON && front === undefined) {
			for (const target of this.targets.values()) {
				if (
					target.frame === this.frame &&
					target.hero.IsValid &&
					target.anchor.Contains(cursor)
				) {
					if (this.active === target) {
						this.close()
					} else {
						this.open(target)
					}
					this.pressed.add(key)
					return false
				}
			}
		}
		this.close()
		return true
	}

	private mouseUp(key: VMouseKeys): boolean {
		if (key === VMouseKeys.MK_LBUTTON) {
			this.release()
		}
		return !this.pressed.delete(key)
	}

	/**
	 * Lets go of a held tile: a press that never became a drag flips the tile, a drag pops the
	 * tile back from under the hand to the slot it ranks at.
	 */
	private release(): void {
		const grip = this.grip
		if (grip === undefined) {
			return
		}
		this.grip = undefined
		const target = this.active
		if (target === undefined) {
			return
		}
		if (!grip.active) {
			target.menu.ToggleAbility(target.hero, grip.ability)
			return
		}
		const slot = this.tiles.find(
			(tile, i) => i < this.tileCount && tile.ability === grip.ability
		)
		if (slot === undefined) {
			return
		}
		const cursor = InputManager.CursorOnScreen
		const settling: Settling = {
			ability: grip.ability,
			// where the lifted tile's centre stood, against the slot's, so the pop starts under the hand
			fromX: cursor.x - grip.grabX + slot.box.Width / 2 - slot.box.Center.x,
			fromY: cursor.y - grip.grabY + slot.box.Height / 2 - slot.box.Center.y,
			along: 1,
			tween: new MenuSDK.Tween(
				1,
				along => {
					settling.along = along
				},
				MenuSDK.EThemeScope.Panels
			)
		}
		this.settle(settling)
		settling.tween.To(0, MenuSDK.Duration.Reveal, MenuSDK.Ease.Pop, () => {
			if (this.settling === settling) {
				this.settling = undefined
			}
		})
	}
}

export const abilityPicker = new AbilityPicker()
