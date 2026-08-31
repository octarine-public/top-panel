import { EModeImages } from "./enums/EModeImages"
import { MenuManager } from "./menu"
import { BarsMenu } from "./menu/bars"
import { LastHitMenu } from "./menu/lastHit"
import { RunesMenu } from "./menu/runes"
import { SpellMenu } from "./menu/spells"

const MAX_SLOTS = 10
const MAX_ITEMS = 10
const MAX_LEVEL_TICKS = 7
const CIRCLE_RADIUS = 9999
const WHITE = "#ffffff"
const TRANSPARENT = "#00000000"
const BLACK_120 = "#00000078"
const BLACK_160 = "#000000a0"
const BLACK_180 = "#000000b4"
const BLACK_200 = "#000000c8"
const ITEM_SWEEP = "#ff00008c"

const BLACK_OUT_MANA = new Color(21, 34, 65)
const NO_MANA_OUTLINE = new Color(3, 82, 252)
const BLACK_OUT_HEALTH = new Color(30, 41, 17)
const NO_MANA_ABILITIES = new Color(77, 131, 247)

const NO_MANA_IMAGE_CSS = MenuSDK.CssColor(NO_MANA_ABILITIES)
const NO_MANA_OUTLINE_CSS = MenuSDK.CssColor(NO_MANA_OUTLINE)

const RUNE_DATA = new Map<string, Color>([
	["modifier_rune_invis", Color.Fuchsia],
	["modifier_rune_haste", Color.Red],
	["modifier_rune_arcane", Color.Fuchsia],
	["modifier_rune_doubledamage", Color.Aqua],
	["modifier_rune_shield", Color.Yellow]
])

const RUNE_BAR_COLORS = new Map<string, string>(
	[...RUNE_DATA].map(([name, color]) => [name, MenuSDK.CssColor(color, 160)])
)

const BASE_STYLE: RmlStyle = {
	position: "absolute",
	display: "block",
	visibility: "hidden",
	pointerEvents: "none"
}
const ROOT_STYLE: RmlStyle = {
	position: "absolute",
	left: 0,
	top: 0,
	zIndex: 0,
	pointerEvents: "none"
}
const GROUP_STYLE: RmlStyle = { ...BASE_STYLE, left: 0, top: 0 }
const IMAGE_STYLE = BASE_STYLE
const HEALTH_BACKGROUND_STYLE: RmlStyle = {
	...BASE_STYLE,
	imageColor: MenuSDK.CssColor(BLACK_OUT_HEALTH)
}
const MANA_BACKGROUND_STYLE: RmlStyle = {
	...BASE_STYLE,
	imageColor: MenuSDK.CssColor(BLACK_OUT_MANA)
}
const SDF_STYLE: RmlStyle = { ...BASE_STYLE, backgroundColor: "transparent" }
const LABEL_STYLE: RmlStyle = {
	...BASE_STYLE,
	color: WHITE,
	textAlign: "center",
	whiteSpace: "nowrap",
	fontEffect: "outline(1px #000000)"
}
const BACKED_LABEL_STYLE: RmlStyle = { ...LABEL_STYLE, backgroundColor: BLACK_200 }
const COOLDOWN_LABEL_STYLE: RmlStyle = { ...LABEL_STYLE, fontWeight: 600 }
const BADGE_STYLE: RmlStyle = { ...LABEL_STYLE, backgroundColor: BLACK_180 }
const BUYBACK_BACKGROUND_STYLE: RmlStyle = { ...BASE_STYLE, backgroundColor: BLACK_180 }
const RUNE_BAR_BACKGROUND_STYLE: RmlStyle = { ...BASE_STYLE, backgroundColor: BLACK_200 }

class PanelRef {
	public element: Nullable<HTMLElement>
	public readonly attach = (element: Nullable<HTMLElement | null>) => {
		this.element = element ?? undefined
	}
}

class PanelImageRef {
	public element: Nullable<HTMLElementImage>
	public readonly attach = (element: Nullable<HTMLElementImage | null>) => {
		this.element = element ?? undefined
	}
}

function hide(ref: PanelRef | PanelImageRef): void {
	const element = ref.element
	if (element !== undefined) {
		MenuSDK.WriteShown(element, false)
	}
}

function show(ref: PanelRef | PanelImageRef): void {
	const element = ref.element
	if (element !== undefined) {
		MenuSDK.WriteShown(element, true)
	}
}

function setSrc(ref: PanelImageRef, path: string): void {
	const element = ref.element
	if (element !== undefined && element.hudSource_ !== path) {
		element.hudSource_ = path
		element.setAttribute("src", path)
	}
}

function copyRect(from: Rectangle, into: Rectangle): Rectangle {
	from.pos1.CopyTo(into.pos1)
	from.pos2.CopyTo(into.pos2)
	return into
}

function fontPx(height: number, division: number): number {
	return Math.round(height / Math.max(division, 1.2) + 4)
}

function writeRect(
	element: HTMLElement,
	x: number,
	y: number,
	width: number,
	height: number
): void {
	MenuSDK.WritePx(element, "left", Math.round(x))
	MenuSDK.WritePx(element, "top", Math.round(y))
	MenuSDK.WritePx(element, "width", Math.round(width))
	MenuSDK.WritePx(element, "height", Math.round(height))
}

function writeTextBox(
	ref: PanelRef,
	x: number,
	y: number,
	width: number,
	height: number,
	fontSize: number,
	text: string
): void {
	const element = ref.element
	if (element === undefined) {
		return
	}
	writeRect(element, x, y, width, height)
	MenuSDK.WritePx(element, "line-height", Math.round(height))
	MenuSDK.WritePx(element, "font-size", fontSize)
	MenuSDK.WriteText(element, text)
	MenuSDK.WriteShown(element, true)
}

function writeImage(
	ref: PanelImageRef,
	path: string,
	x: number,
	y: number,
	width: number,
	height: number,
	radius = 0
): void {
	const element = ref.element
	if (element === undefined) {
		return
	}
	setSrc(ref, path)
	writeRect(element, x, y, width, height)
	MenuSDK.WritePx(element, "border-radius", radius)
	MenuSDK.WriteShown(element, true)
}

function writeSweep(
	ref: PanelRef,
	x: number,
	y: number,
	width: number,
	height: number,
	percent: number,
	isCircle: boolean,
	fill: string
): void {
	const element = ref.element
	if (element === undefined) {
		return
	}
	writeRect(element, x, y, width, height)
	if (MenuSDK.MarkValue(element, "m:sweep", percent * 2 + (isCircle ? 1 : 0))) {
		MenuSDK.WriteStyle(
			element,
			"decorator",
			MenuSDK.SdfSweep(isCircle ? CIRCLE_RADIUS : 0, fill, percent).decorator ?? ""
		)
	}
	MenuSDK.WriteShown(element, true)
}

class TopPanelSlot {
	public readonly container = new PanelRef()
	public readonly fowLabel = new PanelRef()
	public readonly lastHitLabel = new PanelRef()
	public readonly healthBackground = new PanelImageRef()
	public readonly healthFill = new PanelImageRef()
	public readonly manaBackground = new PanelImageRef()
	public readonly manaFill = new PanelImageRef()
	public readonly runeGroup = new PanelRef()
	public readonly runeBarBackground = new PanelRef()
	public readonly runeBarFill = new PanelRef()
	public readonly runeIcon = new PanelImageRef()
	public readonly buybackGroup = new PanelRef()
	public readonly buybackBackground = new PanelRef()
	public readonly buybackImage = new PanelImageRef()
	public readonly buybackLabel = new PanelRef()
	public readonly spellGroup = new PanelRef()
	public readonly spellImage = new PanelImageRef()
	public readonly spellSweep = new PanelRef()
	public readonly spellOutline = new PanelRef()
	public readonly spellCooldown = new PanelRef()
	public readonly spellStacks = new PanelRef()
	public readonly levelBadge = new PanelRef()
	public readonly durationBadge = new PanelRef()
	public readonly levelTicks: PanelImageRef[] = []
	public readonly itemsGroup = new PanelRef()
	public readonly itemImages: PanelImageRef[] = []
	public readonly itemSweeps: PanelRef[] = []
	public readonly ultimateIcon = new PanelImageRef()

	constructor() {
		for (let i = 0; i < MAX_LEVEL_TICKS; i++) {
			this.levelTicks.push(new PanelImageRef())
		}
		for (let i = 0; i < MAX_ITEMS; i++) {
			this.itemImages.push(new PanelImageRef())
			this.itemSweeps.push(new PanelRef())
		}
	}

	public Render(key: number): React.ReactElement {
		const spellChildren: React.ReactElement[] = [
			React.createElement("img", {
				key: "image",
				ref: this.spellImage.attach,
				style: IMAGE_STYLE
			}),
			React.createElement("div", {
				key: "sweep",
				ref: this.spellSweep.attach,
				style: SDF_STYLE
			}),
			React.createElement("div", {
				key: "outline",
				ref: this.spellOutline.attach,
				style: SDF_STYLE
			}),
			React.createElement("div", {
				key: "cooldown",
				ref: this.spellCooldown.attach,
				style: COOLDOWN_LABEL_STYLE
			}),
			React.createElement("div", {
				key: "stacks",
				ref: this.spellStacks.attach,
				style: LABEL_STYLE
			}),
			React.createElement("div", {
				key: "level",
				ref: this.levelBadge.attach,
				style: BADGE_STYLE
			}),
			React.createElement("div", {
				key: "duration",
				ref: this.durationBadge.attach,
				style: BADGE_STYLE
			})
		]
		for (let i = 0; i < this.levelTicks.length; i++) {
			spellChildren.push(
				React.createElement("img", {
					key: `tick${i}`,
					ref: this.levelTicks[i].attach,
					style: IMAGE_STYLE,
					src: ImageData.Icons.levelup_button_3
				})
			)
		}
		const itemChildren: React.ReactElement[] = []
		for (let i = 0; i < this.itemImages.length; i++) {
			itemChildren.push(
				React.createElement("img", {
					key: `item${i}`,
					ref: this.itemImages[i].attach,
					style: IMAGE_STYLE
				})
			)
		}
		for (let i = 0; i < this.itemSweeps.length; i++) {
			itemChildren.push(
				React.createElement("div", {
					key: `sweep${i}`,
					ref: this.itemSweeps[i].attach,
					style: SDF_STYLE
				})
			)
		}
		return React.createElement(
			"div",
			{ key, ref: this.container.attach, style: GROUP_STYLE },
			React.createElement(
				"div",
				{ key: "rune", ref: this.runeGroup.attach, style: GROUP_STYLE },
				React.createElement("div", {
					key: "background",
					ref: this.runeBarBackground.attach,
					style: RUNE_BAR_BACKGROUND_STYLE
				}),
				React.createElement("div", {
					key: "fill",
					ref: this.runeBarFill.attach,
					style: BASE_STYLE
				}),
				React.createElement("img", {
					key: "icon",
					ref: this.runeIcon.attach,
					style: IMAGE_STYLE
				})
			),
			React.createElement("div", {
				key: "fow",
				ref: this.fowLabel.attach,
				style: BACKED_LABEL_STYLE
			}),
			React.createElement("div", {
				key: "lasthit",
				ref: this.lastHitLabel.attach,
				style: BACKED_LABEL_STYLE
			}),
			React.createElement("img", {
				key: "healthbg",
				ref: this.healthBackground.attach,
				style: HEALTH_BACKGROUND_STYLE
			}),
			React.createElement("img", {
				key: "healthfill",
				ref: this.healthFill.attach,
				style: IMAGE_STYLE
			}),
			React.createElement("img", {
				key: "manabg",
				ref: this.manaBackground.attach,
				style: MANA_BACKGROUND_STYLE
			}),
			React.createElement("img", {
				key: "manafill",
				ref: this.manaFill.attach,
				style: IMAGE_STYLE
			}),
			React.createElement(
				"div",
				{ key: "buyback", ref: this.buybackGroup.attach, style: GROUP_STYLE },
				React.createElement("div", {
					key: "background",
					ref: this.buybackBackground.attach,
					style: BUYBACK_BACKGROUND_STYLE
				}),
				React.createElement("img", {
					key: "image",
					ref: this.buybackImage.attach,
					style: IMAGE_STYLE
				}),
				React.createElement("div", {
					key: "label",
					ref: this.buybackLabel.attach,
					style: LABEL_STYLE
				})
			),
			React.createElement(
				"div",
				{ key: "spell", ref: this.spellGroup.attach, style: GROUP_STYLE },
				...spellChildren
			),
			React.createElement(
				"div",
				{ key: "items", ref: this.itemsGroup.attach, style: GROUP_STYLE },
				...itemChildren
			),
			React.createElement("img", {
				key: "ultimate",
				ref: this.ultimateIcon.attach,
				style: IMAGE_STYLE
			})
		)
	}
}

class TopPanelRoot {
	public static readonly Slots: TopPanelSlot[] = []
	private static mounted = false

	public static Mount(): void {
		if (this.mounted) {
			return
		}
		this.mounted = true
		for (let i = 0; i < MAX_SLOTS; i++) {
			this.Slots.push(new TopPanelSlot())
		}
		MenuSDK.RegisterPanel("top-panel", this.render, MenuSDK.EPanelLayer.Screen)
	}

	public static HideAll(): void {
		for (const slot of this.Slots) {
			hide(slot.container)
		}
	}

	private static readonly render = (): React.ReactNode =>
		React.createElement(
			"div",
			{ style: ROOT_STYLE },
			...TopPanelRoot.Slots.map((slot, i) => slot.Render(i))
		)
}

export class GUIPlayer {
	public static SalutesOffset = 0
	public static IsAltDown = false
	public static BlackOutManaColor = BLACK_OUT_MANA
	public static NoManaOutlineColor = NO_MANA_OUTLINE
	public static BlackOutHealthColor = BLACK_OUT_HEALTH
	public static NoManaAbilitiesColor = NO_MANA_ABILITIES

	public static runeData = RUNE_DATA

	public static HideAll(): void {
		TopPanelRoot.HideAll()
	}

	private buyback: Nullable<Rectangle>
	private salutes: Nullable<Rectangle>
	private manabar: Nullable<Rectangle>
	private healthbar: Nullable<Rectangle>
	private heroImage: Nullable<Rectangle>
	private respawnTimer: Nullable<Rectangle>
	private tpIndicator: Nullable<Rectangle>
	private ultReadyIndicators: Nullable<Rectangle>
	private readonly fromBarPosition = new Rectangle()

	private cachedTopBar: Nullable<typeof GUIInfo.TopBar>
	private cachedTeam: Nullable<Team>
	private cachedTeamSlot = -1
	private baseTpIndicator: Nullable<Rectangle>

	private slot: Nullable<TopPanelSlot>
	private readonly workRect = new Rectangle()
	private readonly itemsRect = new Rectangle()
	private readonly buybackRect = new Rectangle()
	private readonly buybackWork = new Rectangle()

	constructor(private readonly player: PlayerCustomData) {
		TopPanelRoot.Mount()
	}

	protected get GUIReady() {
		return GUIInfo !== undefined && GUIInfo.TopBar !== undefined
	}

	protected get IsAlive() {
		return this.player.Hero?.IsAlive ?? true
	}

	protected get IsVisible() {
		return this.player.Hero?.IsVisible ?? false
	}

	public Hide(): void {
		const slot = this.slot
		if (slot !== undefined) {
			hide(slot.container)
		}
	}

	public HideBottomData(): void {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		hide(slot.healthBackground)
		hide(slot.healthFill)
		hide(slot.manaBackground)
		hide(slot.manaFill)
		hide(slot.buybackGroup)
		hide(slot.spellGroup)
		hide(slot.itemsGroup)
	}

	public CanRenderFowTime(menu: MenuManager) {
		const slot = this.slot
		if (slot === undefined) {
			return false
		}
		const hero = this.player.Hero
		const isAlt = GUIPlayer.IsAltDown
		const heroImage = this.heroImage
		const becameDormantTime = hero?.BecameDormantTime ?? 0
		const visible =
			menu.General.FowTime.value &&
			hero !== undefined &&
			heroImage !== undefined &&
			!(isAlt && this.TeamState(menu.LastHitMenu.Team.SelectedID)) &&
			this.player.IsEnemy() &&
			this.IsAlive &&
			!this.IsVisible &&
			becameDormantTime > 0
		if (!visible || heroImage === undefined) {
			hide(slot.fowLabel)
			return false
		}
		const time = Math.abs(Math.round(GameState.RawGameTime - becameDormantTime))
		let strTime: Nullable<string>
		if (time > 60) {
			strTime = Math.formatTime(time)
		}
		const stroke = this.getStrokePosition(copyRect(heroImage, this.workRect), isAlt)
		writeTextBox(
			slot.fowLabel,
			stroke.x,
			stroke.y,
			stroke.Width,
			stroke.Height,
			fontPx(stroke.Height, isAlt ? 1.8 : 1.3),
			strTime ?? time.toString()
		)
		hide(slot.lastHitLabel)
		return true
	}

	public RenderLastHit(menu: LastHitMenu) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		const hero = this.player.Hero
		const heroImage = this.heroImage
		if (
			hero === undefined ||
			heroImage === undefined ||
			!this.TeamState(menu.Team.SelectedID)
		) {
			hide(slot.lastHitLabel)
			return
		}
		const stroke = this.getStrokePosition(copyRect(heroImage, this.workRect))
		writeTextBox(
			slot.lastHitLabel,
			stroke.x,
			stroke.y,
			stroke.Width,
			stroke.Height,
			fontPx(stroke.Height, 1.3),
			`${this.player.LastHitCount}/${this.player.DenyCount}`
		)
	}

	public RenderMana(menu: BarsMenu) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		const stateMP = this.TeamState(menu.TeamMana.SelectedID)
		const stateHP = this.TeamState(menu.TeamHealth.SelectedID)

		const position = this.BarPosition(stateHP)
		if (position === undefined || this.isOpenHudContains(position)) {
			hide(slot.manaBackground)
			hide(slot.manaFill)
			return
		}

		this.copyTo(position)

		if (
			!stateMP ||
			!this.IsAlive ||
			(!this.player.IsEnemy() && GUIPlayer.IsAltDown)
		) {
			hide(slot.manaBackground)
			hide(slot.manaFill)
			return
		}

		this.Bars(slot.manaBackground, slot.manaFill, position, true)
	}

	public RenderHealth(menu: BarsMenu) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		const position = this.BarPosition()
		const stateHP = this.TeamState(menu.TeamHealth.SelectedID)
		if (position === undefined || this.isOpenHudContains(position)) {
			hide(slot.healthBackground)
			hide(slot.healthFill)
			return
		}

		this.copyTo(position)

		if (
			!stateHP ||
			!this.IsAlive ||
			(!this.player.IsEnemy() && GUIPlayer.IsAltDown)
		) {
			hide(slot.healthBackground)
			hide(slot.healthFill)
			return
		}

		this.Bars(slot.healthBackground, slot.healthFill, position, false)
	}

	public RenderSpell(menu: MenuManager, items: Item[], spells: Ability[]) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		if (!menu.SpellMenu.State.value) {
			hide(slot.spellGroup)
			return
		}
		const position = this.tpIndicator
		if (position === undefined || this.isOpenHudContains(position)) {
			hide(slot.spellGroup)
			return
		}

		if (this.CanRenderTpScroll(menu, items)) {
			return
		}

		const abilMenu = menu.SpellMenu
		const abilily = this.getAbility(spells, abilMenu, abilMenu.OnlyUlti.value)
		if (abilily === undefined) {
			hide(slot.spellGroup)
			return
		}

		const general = menu.General
		const isFormatTime = general.FormatTime.value
		const outlineAllyColor = menu.SpellMenu.OutlineAlly.SelectedColor
		const outlineEnemyColor = menu.SpellMenu.OutlineEnemy.SelectedColor
		const isCircle = general.ModeImages.SelectedID === EModeImages.Circles

		const cooldown = abilily.Cooldown
		const cooldownCeil = Math.ceil(cooldown)

		let alpha = 255
		if (cooldown && cooldown <= 0.1) {
			alpha = Math.round((cooldown / 0.1) * 255)
		}

		if (
			!this.Image(
				slot,
				abilily.TexturePath,
				abilily.ManaCost,
				cooldownCeil,
				abilily.CooldownPercent,
				position,
				isCircle ? 0 : -1,
				outlineAllyColor,
				outlineEnemyColor,
				false,
				abilily.StackCount,
				isFormatTime,
				alpha
			)
		) {
			return
		}

		if (general.LevelState.value) {
			this.Level(slot, abilily, cooldown, position, isCircle)
		} else {
			hide(slot.levelBadge)
			this.hideTicks(slot)
		}

		if (general.DurationState.value) {
			this.lvlOrChargesOrDuration(
				slot,
				Math.ceil(abilily.CooldownDuration),
				position,
				isCircle,
				false
			)
		} else {
			hide(slot.durationBadge)
		}
	}

	public RenderMiniItems(menu: MenuManager, items: Item[]) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		const itemMenu = menu.ItemMenu
		const stateItems = this.TeamState(itemMenu.Team.SelectedID)
		if (!stateItems) {
			hide(slot.itemsGroup)
			return
		}
		const position = copyRect(this.fromBarPosition, this.itemsRect)
		position.pos1.AddScalarY(position.Height + GUIInfo.ScaleHeight(2))

		const imageSize = position.Width * 0.3

		if (this.isOpenHudContains(position)) {
			hide(slot.itemsGroup)
			return
		}

		const step = imageSize + 2
		const isCircle = menu.General.ModeImages.SelectedID === EModeImages.Circles
		const perRow = Math.max(1, Math.floor((position.Width - imageSize) / step) + 1)
		const reservedCell = perRow + Math.floor(perRow / 2)
		const radius = isCircle ? Math.round(imageSize / 2) : 0

		show(slot.itemsGroup)

		let ordinal = 0
		for (let index = items.length - 1; index > -1; index--) {
			const item = items[index]
			if (
				item instanceof item_tpscroll ||
				item instanceof item_travel_boots ||
				item instanceof item_travel_boots_2
			) {
				continue
			}
			if (ordinal >= slot.itemImages.length) {
				break
			}

			const cell = ordinal < reservedCell ? ordinal : ordinal + 1
			const col = cell % perRow
			const row = Math.floor(cell / perRow)
			const x = position.x + col * step
			const y = position.y + row * step

			writeImage(
				slot.itemImages[ordinal],
				item.TexturePath,
				x,
				y,
				imageSize,
				imageSize,
				radius
			)

			const cooldownRatio = item.CooldownPercent
			if (cooldownRatio > 0 && isCircle) {
				writeSweep(
					slot.itemSweeps[ordinal],
					x,
					y,
					imageSize,
					imageSize,
					Math.round(cooldownRatio),
					true,
					ITEM_SWEEP
				)
			} else {
				hide(slot.itemSweeps[ordinal])
			}

			ordinal++
		}

		for (let i = ordinal; i < slot.itemImages.length; i++) {
			hide(slot.itemImages[i])
			hide(slot.itemSweeps[i])
		}
	}

	public RenderBuyback(menu: MenuManager) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		const hero = this.player.Hero
		const buyBackMenu = menu.MenuBuyBack
		if (hero === undefined || !this.TeamState(buyBackMenu.Team.SelectedID)) {
			hide(slot.buybackGroup)
			return
		}
		const buyback = this.buyback
		const barMenu = menu.BarsMenu
		const stateMP = this.TeamState(barMenu.TeamMana.SelectedID)
		const stateHP = this.TeamState(barMenu.TeamHealth.SelectedID)
		if (buyback === undefined) {
			hide(slot.buybackGroup)
			return
		}

		const buybackPosition = copyRect(buyback, this.buybackRect)

		const position =
			!stateHP || !stateMP || !this.IsAlive ? this.fromBarPosition : buybackPosition

		if (!stateHP && this.IsAlive) {
			position.pos1.AddScalarY(position.Height / 2)
		}

		if (!stateMP && this.IsAlive) {
			position.pos1.SubtractScalarY(position.Height / 2)
		}

		const cooldown = this.player.BuyBackColdown
		const hasBuyBack = this.player.HasGoldForBuyBack

		if (!(cooldown > 0)) {
			hide(slot.buybackBackground)
			hide(slot.buybackLabel)
			this.BuyBackReady(slot, position, hasBuyBack, stateHP, stateMP)
			return
		}

		const offset = 2.3
		const newPosition = copyRect(position, this.buybackWork)
		const allyState = !this.player.IsEnemy() && GUIPlayer.IsAltDown

		if (!this.IsAlive) {
			newPosition.y += position.Height
			newPosition.Height -= position.Height / 2 - offset
		} else {
			if (!stateHP && !stateMP) {
				if (!allyState) {
					newPosition.Height *= offset
					newPosition.y -= position.Height - buybackPosition.Height
				}
				if (allyState) {
					newPosition.Height *= offset
					newPosition.y += position.Height * 2 + buybackPosition.Height / 2
				}
			}
			if ((!stateHP && stateMP) || (stateHP && stateMP)) {
				if (!allyState) {
					newPosition.Height *= offset + offset / 2
					newPosition.y += !stateHP && stateMP ? position.Height : 0
				}
				if (allyState) {
					newPosition.Height *= position.Height / 2 + offset / 2 + 0.3
					newPosition.y +=
						!stateHP && stateMP
							? position.Height * 2 + buybackPosition.Height
							: 0
				}
			}
			if (stateHP && !stateMP) {
				if (!allyState) {
					newPosition.Height *= offset / 2
					newPosition.y += position.Height / 2 - buybackPosition.Height / 2
				}
				if (allyState) {
					newPosition.Height *= offset / 2
					newPosition.y += position.Height / 2 + buybackPosition.Height + offset
				}
			}
		}

		this.copyTo(newPosition)

		show(slot.buybackGroup)
		const background = slot.buybackBackground.element
		if (background !== undefined) {
			writeRect(
				background,
				newPosition.x,
				newPosition.y,
				newPosition.Width,
				newPosition.Height
			)
			MenuSDK.WriteShown(background, true)
		}
		writeImage(
			slot.buybackImage,
			ImageData.Icons.buyback_header,
			newPosition.x,
			newPosition.y,
			newPosition.Width,
			newPosition.Height
		)
		writeTextBox(
			slot.buybackLabel,
			newPosition.x,
			newPosition.y,
			newPosition.Width,
			newPosition.Height,
			fontPx(newPosition.Height, 1.3),
			Math.formatTime(cooldown)
		)
	}

	public RenderRune(menu: RunesMenu) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		if (!this.TeamState(menu.Team.SelectedID)) {
			hide(slot.runeGroup)
			return
		}

		const hero = this.player.Hero
		const ultPosition = this.ultReadyIndicators
		if (ultPosition === undefined || hero === undefined) {
			hide(slot.runeGroup)
			return
		}

		const buffs = hero.Buffs
		let modifier: Nullable<Modifier>
		for (let i = buffs.length - 1; i > -1; i--) {
			if (GUIPlayer.runeData.has(buffs[i].Name)) {
				modifier = buffs[i]
				break
			}
		}
		if (modifier === undefined) {
			hide(slot.runeGroup)
			return
		}

		show(slot.runeGroup)
		this.cooldownRuneBar(slot, modifier)

		const scale = GUIInfo.ScaleHeight(10)
		const iconWidth = GUIInfo.ScaleWidth(18)
		const iconHeight = GUIInfo.ScaleHeight(18)
		const y = ultPosition.y - (iconHeight / 2 - 3)
		const x =
			this.player.Team === Team.Radiant
				? ultPosition.x + ultPosition.Width - iconWidth + scale
				: ultPosition.x - scale

		writeImage(slot.runeIcon, modifier.GetTexturePath(), x, y, iconWidth, iconHeight)
	}

	public UpdateGUI(skipBottomData?: boolean) {
		if (!this.GUIReady) {
			return
		}
		const team = this.player.Team
		const teamSlot = this.player.TeamSlot
		const topBar = GUIInfo.TopBar

		if (
			topBar !== this.cachedTopBar ||
			team !== this.cachedTeam ||
			teamSlot !== this.cachedTeamSlot
		) {
			this.cachedTopBar = topBar
			this.cachedTeam = team
			this.cachedTeamSlot = teamSlot
			this.refreshTopBarRects(topBar, team === Team.Dire, teamSlot)
			this.bindSlot(team, teamSlot)
		}

		const slot = this.slot
		if (slot !== undefined) {
			show(slot.container)
		}

		if (skipBottomData) {
			return
		}

		this.applyTpIndicatorOffsets()
	}

	public TeamState(selectedID: number) {
		return (
			selectedID === 1 ||
			(selectedID === 2 && this.player.IsEnemy()) ||
			(selectedID === 3 && !this.player.IsEnemy())
		)
	}

	public RenderIconUltimate(menu: MenuManager, abiliies: Ability[]) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		const basePosition = this.ultReadyIndicators
		if (basePosition === undefined || this.player.Hero === undefined) {
			hide(slot.ultimateIcon)
			return
		}

		const abilily = this.getAbility(abiliies, menu.SpellMenu, true, true, true)
		if (abilily === undefined || !(abilily.Level > 0) || !abilily.IsUltimate) {
			hide(slot.ultimateIcon)
			return
		}

		const remaining = Math.ceil(abilily.Cooldown)
		const iconWidth = GUIInfo.ScaleWidth(16)
		const iconHeight = GUIInfo.ScaleHeight(16)
		const x = basePosition.x + (basePosition.Width - iconWidth) / 2
		const y = basePosition.y + (basePosition.Height - iconHeight) / 2

		let imageUlti = ""
		if (!(remaining > 0)) {
			imageUlti = ImageData.Icons.ult_ready
		}

		if (remaining !== 0) {
			imageUlti = ImageData.Icons.ult_cooldown
		}

		if (this.player.Hero.Mana < abilily.ManaCost) {
			imageUlti = ImageData.Icons.ult_no_mana
		}

		writeImage(slot.ultimateIcon, imageUlti, x, y, iconWidth, iconHeight)
	}

	protected Image(
		slot: TopPanelSlot,
		texture: string,
		manaCost: number,
		cooldown: number,
		ratio: number,
		position: Rectangle,
		round = 0,
		colorOutlineAlly: Color,
		colorOutlineEnemy: Color,
		isTP = false,
		stackCount = 0,
		formatTime = false,
		alpha = 255
	): boolean {
		const hero = this.player.Hero
		if (hero === undefined || (!(cooldown > 0) && !isTP)) {
			hide(slot.spellGroup)
			return false
		}

		const group = slot.spellGroup.element
		if (group !== undefined) {
			MenuSDK.WriteShown(group, true)
			MenuSDK.WriteFmt(group, "opacity", Math.round((alpha / 255) * 100) / 100, "")
		}

		const noMana = hero.Mana < manaCost && this.IsAlive
		const isCircle = round >= 0
		const x = position.x
		const y = position.y
		const width = position.Width
		const height = position.Height

		writeImage(
			slot.spellImage,
			texture,
			x,
			y,
			width,
			height,
			isCircle ? Math.round(width / 2) : 0
		)
		const image = slot.spellImage.element
		if (image !== undefined) {
			MenuSDK.WriteStyle(image, "image-color", noMana ? NO_MANA_IMAGE_CSS : WHITE)
		}

		const outlineColor = noMana
			? NO_MANA_OUTLINE_CSS
			: MenuSDK.CssColor(
					!hero.IsEnemy() ? colorOutlineAlly : colorOutlineEnemy,
					255
				)
		const outlineWidth = Math.round(GUIInfo.ScaleHeight(4))
		const outline = slot.spellOutline.element
		if (outline !== undefined) {
			writeRect(outline, x, y, width, height)
			MenuSDK.WriteStyle(
				outline,
				"decorator",
				(isCircle
					? MenuSDK.SdfCircle(TRANSPARENT, outlineWidth, outlineColor)
					: MenuSDK.SdfShape(0, TRANSPARENT, outlineWidth, outlineColor)
				).decorator ?? ""
			)
			MenuSDK.WriteShown(outline, true)
		}

		if (ratio > 0) {
			writeSweep(
				slot.spellSweep,
				x,
				y,
				width,
				height,
				Math.round(ratio),
				isCircle,
				isCircle ? BLACK_120 : BLACK_160
			)
		} else {
			hide(slot.spellSweep)
		}

		if (!(ratio > 0)) {
			hide(slot.spellCooldown)
			hide(slot.spellStacks)
			return true
		}

		const text = formatTime
			? cooldown > 60
				? Math.formatTime(cooldown)
				: cooldown.toFixed()
			: cooldown.toFixed()

		if (stackCount === 0) {
			writeTextBox(slot.spellCooldown, x, y, width, height, fontPx(height, 3), text)
			hide(slot.spellStacks)
			return true
		}

		if (!(stackCount > 0) || !(cooldown > 0)) {
			hide(slot.spellCooldown)
			hide(slot.spellStacks)
			return true
		}

		const division = 1.8
		const half = height / 2
		writeTextBox(slot.spellCooldown, x, y, width, half, fontPx(half, division), text)

		const stackCountStr =
			stackCount >= 1000
				? `${(stackCount / 1000).toFixed(1)}k`
				: stackCount.toString()

		const stacks = slot.spellStacks.element
		if (stacks !== undefined) {
			const stackSize = fontPx(half, division)
			writeRect(stacks, x, y + half, width, half)
			MenuSDK.WritePx(stacks, "line-height", stackSize)
			MenuSDK.WritePx(stacks, "font-size", stackSize)
			MenuSDK.WriteText(stacks, stackCountStr)
			MenuSDK.WriteShown(stacks, true)
		}
		return true
	}

	protected CanRenderTpScroll(menu: MenuManager, items: Item[]) {
		const slot = this.slot
		if (slot === undefined) {
			return false
		}
		const itemMenu = menu.ItemMenu
		if (!this.TeamState(itemMenu.Team.SelectedID) || !GUIPlayer.IsAltDown) {
			return false
		}

		const position = this.tpIndicator
		if (position === undefined) {
			return false
		}

		const item =
			items.find(x => x instanceof item_travel_boots_2) ??
			items.find(x => x instanceof item_travel_boots) ??
			items.find(x => x instanceof item_tpscroll)

		if (item === undefined || !itemMenu.Items.IsEnabled(item.Name)) {
			return false
		}

		const cdSource = items.reduce((best, x) => {
			if (
				!(
					x instanceof item_tpscroll ||
					x instanceof item_travel_boots ||
					x instanceof item_travel_boots_2
				)
			) {
				return best
			}
			return x.Cooldown > best.Cooldown ? x : best
		}, item)

		const cooldown = Math.ceil(cdSource.Cooldown)

		const general = menu.General
		const chargeState = general.ChargeState.value
		const isFormatTime = menu.General.FormatTime.value
		const outlineAllyColor = menu.SpellMenu.OutlineAlly.SelectedColor
		const isCircle = general.ModeImages.SelectedID === EModeImages.Circles

		this.Image(
			slot,
			item.TexturePath,
			cdSource.ManaCost,
			cooldown,
			cdSource.CooldownPercent,
			position,
			isCircle ? 0 : -1,
			outlineAllyColor,
			outlineAllyColor,
			true,
			0,
			isFormatTime
		)

		if (chargeState) {
			this.lvlOrChargesOrDuration(slot, item.CurrentCharges, position, isCircle)
		} else {
			hide(slot.durationBadge)
		}

		hide(slot.levelBadge)
		this.hideTicks(slot)
		return true
	}

	protected Bars(
		background: PanelImageRef,
		fill: PanelImageRef,
		position: Rectangle,
		isMana: boolean
	) {
		const hero = this.player.Hero
		if (hero === undefined) {
			hide(background)
			hide(fill)
			return
		}

		const minSizeX = 1 / (position.Width * 2)
		const decimal = this.getDecimalHealthOrMana(hero, isMana)

		const image = !isMana
			? hero.IsEnemy()
				? ImageData.Icons.topbar_health_dire
				: ImageData.Icons.topbar_health
			: ImageData.Icons.topbar_mana

		writeImage(
			background,
			image,
			position.x,
			position.y,
			position.Width,
			position.Height
		)
		writeImage(
			fill,
			image,
			position.x,
			position.y,
			position.Width * Math.max(decimal, minSizeX),
			position.Height
		)
	}

	protected BuyBackReady(
		slot: TopPanelSlot,
		position: Rectangle,
		hasBuyBack: boolean,
		stateHP: boolean,
		stateMP: boolean
	) {
		if ((!this.player.IsEnemy() && !this.IsAlive) || !hasBuyBack) {
			hide(slot.buybackGroup)
			return
		}

		if ((!stateHP || !stateMP) && !this.player.IsEnemy() && GUIPlayer.IsAltDown) {
			hide(slot.buybackGroup)
			return
		}

		const offset = 2.3
		const newPosition = copyRect(position, this.buybackWork)

		if (this.IsAlive) {
			if (!stateHP && !stateMP) {
				newPosition.Height *= 2
				newPosition.y -= position.Height
			}
			if ((!stateHP && stateMP) || (stateHP && stateMP)) {
				newPosition.Height *= 2
				newPosition.y -= stateHP && stateMP ? position.Height : 0
			}
			if (stateHP && !stateMP) {
				newPosition.y -= position.Height / 2 - offset
			}
		}

		this.copyTo(newPosition)

		show(slot.buybackGroup)
		const image = !this.IsAlive
			? ImageData.Icons.buyback_header
			: ImageData.Icons.buyback_topbar_alive
		writeImage(
			slot.buybackImage,
			image,
			newPosition.x,
			newPosition.y,
			newPosition.Width,
			newPosition.Height
		)
	}

	protected Level(
		slot: TopPanelSlot,
		abilily: Ability,
		cooldown: number,
		position: Rectangle,
		isCircle: boolean
	) {
		if (!(cooldown > 0)) {
			hide(slot.levelBadge)
			this.hideTicks(slot)
			return
		}

		if (!isCircle) {
			hide(slot.levelBadge)
			this.levelSquare(slot, abilily, cooldown, position)
			return
		}

		this.hideTicks(slot)
		this.lvlOrChargesOrDuration(slot, abilily.Level, position, isCircle, true)
	}

	protected BarPosition(isMana = false) {
		if (!this.IsAlive) {
			return this.respawnTimer
		}
		return isMana ? this.manabar : this.healthbar
	}

	private bindSlot(team: Team, teamSlot: number) {
		const valid =
			teamSlot >= 0 &&
			teamSlot < MAX_SLOTS / 2 &&
			(team === Team.Radiant || team === Team.Dire)
		const next = valid
			? TopPanelRoot.Slots[(team === Team.Dire ? MAX_SLOTS / 2 : 0) + teamSlot]
			: undefined
		if (this.slot === next) {
			return
		}
		if (this.slot !== undefined) {
			hide(this.slot.container)
		}
		this.slot = next
	}

	private hideTicks(slot: TopPanelSlot) {
		for (const tick of slot.levelTicks) {
			hide(tick)
		}
	}

	private lvlOrChargesOrDuration(
		slot: TopPanelSlot,
		value: number,
		recPosition: Rectangle,
		isCircle: boolean,
		isLevel = false
	) {
		const ref = isLevel ? slot.levelBadge : slot.durationBadge
		if (!(value > 0)) {
			hide(ref)
			return
		}
		const element = ref.element
		if (element === undefined) {
			return
		}

		const width = recPosition.Width * 0.33
		const x = recPosition.Right - width
		const y = !isLevel ? recPosition.Top : recPosition.Bottom - width

		writeRect(element, x, y, width, width)
		MenuSDK.WritePx(element, "border-radius", isCircle ? Math.round(width / 2) : 0)
		MenuSDK.WritePx(element, "line-height", Math.round(width))
		MenuSDK.WritePx(element, "font-size", fontPx(width, value >= 100 ? 2 : 1.2))
		MenuSDK.WriteText(element, value.toString())
		MenuSDK.WriteShown(element, true)
	}

	private levelSquare(
		slot: TopPanelSlot,
		abilily: Ability,
		cooldown: number,
		position: Rectangle
	) {
		if (!(cooldown > 0) || abilily.MaxLevel <= 1) {
			this.hideTicks(slot)
			return
		}

		const subtractSize = GUIInfo.ScaleHeight(5)
		const rectX = position.x + subtractSize / 2
		const rectWidth = position.Width - subtractSize * 1.5
		const bottom = position.Bottom - subtractSize

		const levelWidth = Math.round(rectWidth / abilily.MaxLevel)
		const space = levelWidth * 0.07
		const levelDrawWidth = levelWidth - space * 2

		const levelHeight = position.Height * 0.07
		const posY = bottom - levelHeight

		const ticks = slot.levelTicks
		const currLvl = Math.min(abilily.Level, ticks.length)
		for (let i = 0; i < currLvl; i++) {
			const element = ticks[i].element
			if (element === undefined) {
				continue
			}
			writeRect(
				element,
				rectX + space + i * levelWidth,
				posY,
				levelDrawWidth,
				levelHeight
			)
			MenuSDK.WriteShown(element, true)
		}
		for (let i = currLvl; i < ticks.length; i++) {
			hide(ticks[i])
		}
	}

	private cooldownRuneBar(slot: TopPanelSlot, modifier: Modifier) {
		const position = this.BarPosition()
		const color = RUNE_BAR_COLORS.get(modifier.Name)
		if (position === undefined || color === undefined) {
			hide(slot.runeBarBackground)
			hide(slot.runeBarFill)
			return
		}

		const cooldownRatio = modifier.RemainingTime / modifier.Duration
		const height = position.Height
		const barY = position.y - (height / 2 - 1)
		const barHeight = (height + height / 2 - 1) / 3
		const minSizeX = 1 / (position.Width * 2)

		const background = slot.runeBarBackground.element
		if (background !== undefined) {
			writeRect(background, position.x, barY, position.Width, barHeight)
			MenuSDK.WriteShown(background, true)
		}

		const fill = slot.runeBarFill.element
		if (fill !== undefined) {
			writeRect(
				fill,
				position.x,
				barY,
				position.Width * Math.max(cooldownRatio, minSizeX),
				barHeight
			)
			MenuSDK.WriteStyle(fill, "background-color", color)
			MenuSDK.WriteShown(fill, true)
		}
	}

	private refreshTopBarRects(
		topBar: typeof GUIInfo.TopBar,
		isDire: boolean,
		teamSlot: number
	) {
		this.heroImage = isDire
			? topBar.DirePlayersHeroImages[teamSlot]
			: topBar.RadiantPlayersHeroImages[teamSlot]

		this.ultReadyIndicators = isDire
			? topBar.DirePlayersUltReadyIndicators[teamSlot]
			: topBar.RadiantPlayersUltReadyIndicators[teamSlot]

		this.manabar = isDire
			? topBar.DirePlayersManabars[teamSlot]
			: topBar.RadiantPlayersManabars[teamSlot]

		this.healthbar = isDire
			? topBar.DirePlayersHealthbars[teamSlot]
			: topBar.RadiantPlayersHealthbars[teamSlot]

		this.respawnTimer = isDire
			? topBar.DirePlayersRespawnTimers[teamSlot]
			: topBar.RadiantPlayersRespawnTimers[teamSlot]

		this.buyback = isDire
			? topBar.DirePlayersBuybacks[teamSlot]
			: topBar.RadiantPlayersBuybacks[teamSlot]

		this.salutes = isDire
			? topBar.DirePlayersSalutes[teamSlot]
			: topBar.RadiantPlayersSalutes[teamSlot]

		const baseTp = (
			isDire
				? topBar.DirePlayersTPIndicators[teamSlot]
				: topBar.RadiantPlayersTPIndicators[teamSlot]
		)?.Clone()

		if (baseTp !== undefined) {
			const center = baseTp.Center
			baseTp.Width = GUIInfo.ScaleWidth(36)
			baseTp.Height = GUIInfo.ScaleHeight(36)
			baseTp.x = center.x - baseTp.Width / 2
			baseTp.y = center.y - baseTp.Height / 2 + GUIInfo.ScaleHeight(3)
		}

		this.baseTpIndicator = baseTp
		this.tpIndicator = baseTp?.Clone()
	}

	private applyTpIndicatorOffsets() {
		const base = this.baseTpIndicator
		const tp = this.tpIndicator
		if (base === undefined || tp === undefined) {
			return
		}

		base.pos1.CopyTo(tp.pos1)
		base.pos2.CopyTo(tp.pos2)

		this.setSalutesOffset()

		if (GUIPlayer.SalutesOffset !== 0) {
			tp.AddY(GUIPlayer.SalutesOffset)
		}

		if (this.player.BuyBackColdown > 0 && !this.IsAlive) {
			tp.AddY(10)
		}
	}

	private isOpenHudContains(position: Nullable<Rectangle>) {
		if (GUIInfo === undefined || position === undefined) {
			return false
		}
		const mini = GUIInfo.OpenShopMini.GuideFlyout,
			large = GUIInfo.OpenShopLarge.GuideFlyout

		if (
			InputManager.IsShopOpen &&
			(mini.Contains(position.pos1) || large.Contains(position.pos1))
		) {
			return true
		}

		if (
			InputManager.IsScoreboardOpen &&
			GUIInfo.Scoreboard.Background.Contains(position.pos1)
		) {
			return true
		}

		return false
	}

	private setSalutesOffset() {
		if (!this.player.IsLocalPlayer) {
			return
		}
		if (!GUIPlayer.IsAltDown) {
			GUIPlayer.SalutesOffset = 0
			return
		}
		if (!(this.player.AvailableSalutes > 0)) {
			GUIPlayer.SalutesOffset = 0
			return
		}
		if (this.player.TimeOfLastSaluteSent + 30 > GameState.RawGameTime) {
			GUIPlayer.SalutesOffset = 0
			return
		}
		GUIPlayer.SalutesOffset = this.salutes?.Height ?? 0
	}

	private getStrokePosition(position: Rectangle, isAlt = false) {
		const size = 4
		const team = this.player.Team
		position.Height -= Math.round(position.Height / 1.75)
		if (isAlt) {
			position.Width /= 2
			position.AddX(team === Team.Dire ? size : position.Width - 2)
			return position
		}
		if (team === Team.Dire) {
			position.pos1.AddScalarX(size / 2)
		} else {
			const width = Math.round(position.Width / 20)
			position.pos1.AddScalarX(width / 2)
			position.pos2.SubtractScalarX(width)
		}
		return position
	}

	private getAbility(
		arr: Ability[],
		menu: SpellMenu,
		onlyUltimate = false,
		ignoreCooldown = false,
		ignoreEnabled?: boolean
	) {
		let firstOther: Nullable<Ability>
		for (let i = 0, end = arr.length; i < end; i++) {
			const x = arr[i]
			const isUltimate = x.IsUltimate
			if (
				(onlyUltimate && !isUltimate) ||
				(!ignoreCooldown && !(x.Cooldown > 0)) ||
				!((isUltimate && x.IsPassive) || ignoreEnabled || menu.IsEnabled(x))
			) {
				continue
			}
			if (isUltimate) {
				return x
			}
			if (firstOther === undefined) {
				firstOther = x
			}
		}
		return firstOther
	}

	private copyTo(position: Rectangle) {
		position.pos1.CopyTo(this.fromBarPosition.pos1)
		position.pos2.CopyTo(this.fromBarPosition.pos2)
	}

	private getDecimalHealthOrMana(hero: Hero, isMana: boolean) {
		const max = isMana ? hero.MaxMana : hero.MaxHP
		if (max === 0) {
			return 1
		}
		return Math.max(isMana ? hero.ManaPercentDecimal : hero.HPPercentDecimal, 0)
	}
}
