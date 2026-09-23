import { abilityPicker } from "./abilityPicker"
import { ETeamState } from "./enums/ETeamState"
import { ETextEffect } from "./enums/ETextEffect"
import { MenuManager } from "./menu"
import { BarsMenu } from "./menu/bars"
import { LastHitMenu } from "./menu/lastHit"
import { RunesMenu } from "./menu/runes"
import { SpellMenu } from "./menu/spells"
import { TextStyle } from "./menu/style"

const MAX_SLOTS = 10
const MAX_ITEMS = 10
const MAX_LEVEL_TICKS = 7
const CIRCLE_RADIUS = 9999
const RING_MARK = "m:ring"
const TINT_MARK = "m:tint"
const SWEEP_MARK = "m:sweep"
const TYPE_MARK = "m:type"
const TYPE_SIZE_MARK = "m:typesize"
const OUTLINE_MARK = "m:outline"
const MASK_MARK = "m:mask"
const SHADOW_MARK = "m:shadow"
const WHITE = "#ffffff"
const TRANSPARENT = "#00000000"
const BLACK_120 = "#00000078"
const BLACK_160 = "#000000a0"
const BLACK_180 = "#000000b4"
const BLACK_200 = "#000000c8"
const ITEM_SWEEP = "#ff00008c"
// the ring the game's own top bar fills a teleport back up with, and the shade it takes on
// once the mana runs short
const TP_RING = new Color(17, 212, 68) // Panorama #11D444
const TP_RING_NO_MANA = new Color(50, 133, 188) // #3285BC
// the game's teleport is a 48-unit button (.TopBarIndicator #ButtonSize) centred in the 64-unit
// well of `#TopBarTPIcon`, which is the box the SDK hands out as TPIndicators. The scroll sits 4 in
// from the button's edge, the ring 1 in and 2 wide (`#TopBarUltimateCooldown`, `margin: 1px` on a
// `width: 100%` circle: Panorama lays it 36 across in the 38 pixel button at 1080p), and the
// overlay it dims the dial with carries a 5-wide black band at the rim
const TP_WELL = 64
const TP_BUTTON = 48
const TP_ART_MARGIN = 4 / TP_BUTTON
const TP_RING_MARGIN = 1 / TP_BUTTON
const TP_RING_WIDTH = 2 / TP_BUTTON
const TP_TRACK_WIDTH = 5 / TP_BUTTON
const TP_TRACK = "#000000"
// the ability icons sit on the centre of that well, 0.8 of it across: 40.8 in the 51 pixel
// well at 1080p, the size they are tuned to
const ABILITY_BOX = 0.8
// Inherited from .Reborn .InventoryItem #ButtonSize, including on TopBarIndicator.
const ICON_BACKGROUND = "#1a1c1d88"
// Match teleport-esp's compact, black halo around the disc.
const ICON_SHADOW_REACH = 0.1
const ICON_SHADOW_SHADE = "#00000099"
/** The game sets the reading over a top bar icon in 20, inside a 48-unit button. */
const ICON_TEXT_SIZE = 20 / TP_BUTTON
/**
 * How wide the game blurs the shade under that reading, as a share of its size: `#CooldownTimer`
 * carries `text-shadow: 0px 0px 6px 6 #000000` under a twenty.
 */
const GLOW_BLUR = 6 / 20
// the game lays 80% black over the dial, but composites its HUD in linear light, where that
// reads about as dark as 55% does blended in sRGB the way the panel is drawn
const TP_DIAL_SHADE = Math.round(0.55 * 255)

const BLACK_OUT_MANA = new Color(21, 34, 65)
const BLACK_OUT_HEALTH = new Color(30, 41, 17)
// the art of an ability is drawn as it is until its owner runs short of mana, when it takes on
// the blue the game's own HUD tints it
const PLAIN_ART = new Color(255, 255, 255)
const NO_MANA_ABILITIES = new Color(77, 131, 247)

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
const MASK_STYLE: RmlStyle = { ...BASE_STYLE, overflow: "hidden", clip: "always" }
const ART_STYLE: RmlStyle = { position: "absolute", display: "block", left: 0, top: 0 }
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
const BUYBACK_BACKGROUND_STYLE: RmlStyle = { ...BASE_STYLE, backgroundColor: BLACK_180 }
/**
 * The strip the buyback indicator is laid out from, in 1080p pixels. The SDK hands out the
 * game's own `#BuybackIcon` box, 11 tall, while the indicator's geometry is worked from the
 * bottom 4 of it: the strip the top bar used to hand out, and what every multiplier below
 * is tuned to. It is also all the game lets show of its buyback art: the mana bar lies over
 * the rest of the box (`.TopBarManaBar` carries `z-index: 1`, the box's container none).
 */
const BUYBACK_STRIP_HEIGHT = 4
/**
 * How tall the game draws `buyback_topbar_alive` (128x20) in that 60-wide box, in 1080p pixels:
 * two rows of the art to a pixel, its foot on the bottom of the box. The strip then shows the
 * art's bottom eight rows: the gold caps at the ends, then the bright line over the darker one,
 * a pixel each. Squeezed into fewer pixels the line blurs into the shade above it and dims.
 */
const BUYBACK_ART_HEIGHT = 10
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

/**
 * An image cut to its box. A border radius rounds an img's own edge but leaves the art it draws
 * square, so the art sits inside a mask that clips — the pair the SDK's own images are built of.
 * The mask's corner is carved by the sdf shader rather than a border radius: RmlUi's clip steps
 * along a rounded edge, while the shader's mask carries per-pixel coverage.
 */
class ClippedImageRef {
	public readonly mask = new PanelRef()
	public readonly image = new PanelImageRef()

	public get element(): Nullable<HTMLElement> {
		return this.mask.element
	}

	public Render(key: string): React.ReactElement {
		return React.createElement(
			"div",
			{ key, ref: this.mask.attach, style: MASK_STYLE },
			React.createElement("img", { ref: this.image.attach, style: ART_STYLE })
		)
	}
}

/** The backing and soft outer shadow, drawn before the icon's art. */
class IconShadowRef extends PanelRef {
	public Render(key: string): React.ReactElement {
		return React.createElement("div", { key, ref: this.attach, style: SDF_STYLE })
	}
}

function hide(ref: PanelRef | PanelImageRef | ClippedImageRef | IconShadowRef): void {
	const element = ref.element
	if (element !== undefined) {
		MenuSDK.WriteShown(element, false)
	}
}

function show(ref: PanelRef | PanelImageRef | ClippedImageRef): void {
	const element = ref.element
	if (element !== undefined) {
		MenuSDK.WriteShown(element, true)
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

/**
 * The counter under the portrait, the fog timer in its place and the buyback timer are set smaller
 * than their strip.
 */
const STRIP_TEXT_SCALE = 0.78

/**
 * How long an ability's icon takes to come up once the ability is used, and its rim and art to
 * cross from the team's colour to the no-mana blue and back, at the pace the menu's animation
 * speed asks for.
 */
function fadeDuration(): number {
	return MenuSDK.Duration.Fade / MenuSDK.AnimationSpeed()
}

/**
 * A value that eases from wherever it stands to a target over a set time, read off the frame
 * clock each time it is asked for, so a state that flips back halfway turns around from there
 * rather than jumping to either end.
 */
class Ramp {
	private value = 0
	private from = 0
	private target = 0
	private startedAt = 0

	public Toward(target: number, now: number, duration: number): number {
		if (target !== this.target) {
			this.from = this.value
			this.target = target
			this.startedAt = now
		}
		const t = duration > 0 ? Math.min(1, (now - this.startedAt) / duration) : 1
		this.value =
			this.from +
			(this.target - this.from) * MenuSDK.EaseValue(MenuSDK.Ease.Standard, t)
		return this.value
	}

	/** Stands the value at `value` at once, with no run up to it. */
	public Set(value: number): void {
		this.value = this.from = this.target = value
	}
}

/** `from` blended `t` of the way to `to`, channel by channel, written into `into` when in between. */
function mixColor(from: Color, to: Color, t: number, into: Color): Color {
	if (t <= 0) {
		return from
	}
	if (t >= 1) {
		return to
	}
	return into.SetColor(
		Math.round(from.r + (to.r - from.r) * t),
		Math.round(from.g + (to.g - from.g) * t),
		Math.round(from.b + (to.b - from.b) * t),
		Math.round(from.a + (to.a - from.a) * t)
	)
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

/**
 * Sets a label in the type the menu picked: its family, its weight, `size` scaled by its
 * slider, its colour and the shade under the glyphs, and answers the size it wrote. Every one of
 * those follows the style's own stamp and the size asked for, so the run is gated on the pair and
 * builds none of its strings while the label is set in the type it already carries.
 */
function writeType(element: HTMLElement, style: TextStyle, size: number): number {
	const px = Math.max(Math.round(size * style.Scale), 1)
	const resized = MenuSDK.MarkValue(element, TYPE_SIZE_MARK, px)
	const restyled = MenuSDK.MarkValue(element, TYPE_MARK, style.Version)
	if (!resized && !restyled) {
		return px
	}
	MenuSDK.WritePx(element, "font-size", px)
	MenuSDK.WriteStyle(element, "font-family", style.FontFamily)
	MenuSDK.WriteFmt(element, "font-weight", MenuSDK.MenuFontWeight(style.FontWeight), "")
	MenuSDK.WriteStyle(element, "color", style.Color)
	const effect = style.Effect
	const shade = style.Shade
	MenuSDK.WriteStyle(
		element,
		"font-effect",
		effect === ETextEffect.Shadow
			? `shadow(1px 1px ${shade})`
			: effect === ETextEffect.Glow
				? // the game blurs its own shade six wide under a reading set in twenty
					`glow(1px ${Math.max(2, Math.round(px * GLOW_BLUR))}px 0px 0px ${shade})`
				: effect === ETextEffect.Outline ||
					  effect === ETextEffect.OutlineSoftShadow
					? `outline(1px ${shade})`
					: "none"
	)
	MenuSDK.WriteStyle(
		element,
		"filter",
		effect === ETextEffect.SoftShadow || effect === ETextEffect.OutlineSoftShadow
			? `drop-shadow(${style.ShadowShade} 1px 1px ${style.ShadowBlur}px)`
			: "none"
	)
	return px
}

/**
 * The line a reading is laid out in: the box it stands in, grown by twice the room the face's own
 * metrics take off its bottom. A line box is centred on the ascender and the descender rather
 * than on the glyphs, so a face that reaches higher than it falls leaves its digits sitting above
 * the middle of the box; a taller line puts the baseline further down and the glyphs land on the
 * middle. Nothing is moved for a face that centres on its own.
 */
function writeLine(
	element: HTMLElement,
	box: number,
	px: number,
	style: TextStyle
): void {
	MenuSDK.WritePx(element, "line-height", Math.round(box + 2 * px * style.CapShift))
}

/** `background` is the plate under the label, for a label the menu lets the player turn one off. */
function writeTextBox(
	ref: PanelRef,
	style: TextStyle,
	x: number,
	y: number,
	width: number,
	height: number,
	fontSize: number,
	text: string,
	background?: string
): void {
	const element = ref.element
	if (element === undefined) {
		return
	}
	writeRect(element, x, y, width, height)
	writeLine(element, height, writeType(element, style, fontSize), style)
	if (background !== undefined) {
		MenuSDK.WriteStyle(element, "background-color", background)
	}
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
	writeRect(element, x, y, width, height)
	MenuSDK.WriteSizedArt(element, path, Math.round(width), Math.round(height))
	MenuSDK.WritePx(element, "border-radius", radius)
	MenuSDK.WriteShown(element, true)
}

function writeClippedImage(
	ref: ClippedImageRef,
	path: string,
	x: number,
	y: number,
	width: number,
	height: number,
	radius = 0
): void {
	const mask = ref.mask.element
	const art = ref.image.element
	if (mask === undefined || art === undefined) {
		return
	}
	const w = Math.round(width)
	const h = Math.round(height)
	writeRect(mask, x, y, w, h)
	writeMask(mask, radius)
	const [artWidth, artHeight] = coverSize(path, w, h)
	MenuSDK.WritePx(art, "left", Math.round((w - artWidth) / 2))
	MenuSDK.WritePx(art, "top", Math.round((h - artHeight) / 2))
	MenuSDK.WritePx(art, "width", artWidth)
	MenuSDK.WritePx(art, "height", artHeight)
	MenuSDK.WriteSizedArt(art, path, artWidth, artHeight)
	MenuSDK.WriteShown(mask, true)
}

/**
 * An image as wide as its box and `artHeight` tall, standing on the bottom of the box and cut
 * to it, so art taller than the box shows only its lowest rows. Left at the box's height it
 * fills the box the way {@link writeImage} does.
 *
 * The host cuts the art at twice the size it is drawn and the GPU halves it, which averages two
 * rows of the cut into each pixel the way the game's own HUD does. A cut straight to size is a
 * touch softer: the bright line of the buyback strip bled a sixth of itself into the row above.
 */
function writeFootImage(
	ref: ClippedImageRef,
	path: string,
	x: number,
	y: number,
	width: number,
	height: number,
	artHeight = height
): void {
	const mask = ref.mask.element
	const art = ref.image.element
	if (mask === undefined || art === undefined) {
		return
	}
	const w = Math.round(width)
	const h = Math.round(height)
	const artH = Math.round(artHeight)
	writeRect(mask, x, y, w, h)
	writeRect(art, 0, h - artH, w, artH)
	MenuSDK.WriteSizedArt(art, path, 2 * w, 2 * artH)
	MenuSDK.WriteShown(mask, true)
}

/** A backed icon with the same continuous outer shadow for teleports and abilities. */
function writeIconShadow(
	ref: IconShadowRef,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
): void {
	const element = ref.element
	if (element === undefined) {
		return
	}
	const w = Math.round(width)
	const h = Math.round(height)
	const reach = Math.max(2, Math.round(Math.min(w, h) * ICON_SHADOW_REACH))
	const inset = reach + 1
	writeRect(element, x - inset, y - inset, w + 2 * inset, h + 2 * inset)
	const resized = MenuSDK.MarkValue(element, SHADOW_MARK, w * 65536 + h)
	const reshaped = MenuSDK.MarkValue(element, OUTLINE_MARK, radius)
	if (resized || reshaped) {
		MenuSDK.WriteStyle(
			element,
			"decorator",
			MenuSDK.SdfShape(
				MenuSDK.ToLayoutUnits(radius),
				ICON_BACKGROUND,
				0,
				"",
				inset,
				reach,
				ICON_SHADOW_SHADE
			).decorator ?? ""
		)
	}
	MenuSDK.WriteShown(element, true)
}

/** Rounds a clipping element's corner by the sdf mask, whose edge is antialiased. */
function writeMask(mask: HTMLElement, radius: number): void {
	const px = Math.max(Math.round(radius), 0)
	if (!MenuSDK.MarkValue(mask, MASK_MARK, px)) {
		return
	}
	MenuSDK.WriteStyle(
		mask,
		"mask-image",
		px > 0
			? (MenuSDK.SdfShape(MenuSDK.ToLayoutUnits(px), WHITE).decorator ?? "none")
			: "none"
	)
}

/** The pair {@link coverSize} answers with: read straight out of it, never kept. */
const coverBox: [number, number] = [0, 0]

/**
 * The whole-pixel size a source is cut to for a box: the box itself where the source has the
 * box's shape to within a pixel, otherwise the smallest whole-pixel cover of the box. An item's
 * 11:8 art in a square cell is cropped centred rather than squeezed; until the host has measured
 * the source it is cut to the box, which for a matching shape is already the answer. The answer
 * rides {@link coverBox}, since every slot of the panel asks for one on every frame.
 */
function coverSize(
	path: string,
	width: number,
	height: number
): readonly [number, number] {
	const natural = MenuSDK.ImageSize(path)
	if (!(natural.x > 0 && natural.y > 0)) {
		coverBox[0] = width
		coverBox[1] = height
		return coverBox
	}
	const scale = Math.max(width / natural.x, height / natural.y)
	const artWidth = Math.max(Math.round(natural.x * scale), width)
	const artHeight = Math.max(Math.round(natural.y * scale), height)
	coverBox[0] = artWidth - width <= 1 ? width : artWidth
	coverBox[1] = artHeight - height <= 1 ? height : artHeight
	return coverBox
}

/**
 * The dimmed part of a dial: `percent` of a turn ending at twelve o'clock, so what has come back
 * reads clockwise from twelve and the wedge's leading edge follows it round as the cooldown
 * drains. That is the way the game wipes its own cooldowns, and the way the teleport's band is
 * laid by {@link writeArc} — a wedge opening at twelve instead would run the dial backwards.
 * The wedge is cut from a box with corners of `radius` px, {@link CIRCLE_RADIUS} for a disc.
 */
function writeSweep(
	ref: PanelRef,
	x: number,
	y: number,
	width: number,
	height: number,
	percent: number,
	radius: number,
	fill: string
): void {
	const element = ref.element
	if (element === undefined) {
		return
	}
	writeRect(element, x, y, width, height)
	if (MenuSDK.MarkValue(element, SWEEP_MARK, percent + 128 * radius)) {
		MenuSDK.WriteStyle(
			element,
			"decorator",
			MenuSDK.SdfSweep(
				MenuSDK.ToLayoutUnits(radius),
				fill,
				percent,
				(100 - percent) * 3.6
			).decorator ?? ""
		)
		// the teleport's band shares this panel and gates on a mark of its own, so that is
		// cleared for it to lay its own arc afresh over the wedge just written here
		MenuSDK.MarkValue(element, RING_MARK, -1)
	}
	MenuSDK.WriteShown(element, true)
}

/**
 * An arc of a disc laid inside the box's own edge: `percent` of a turn clockwise, opening `from`
 * percent of a turn past twelve o'clock, filled and rimmed as given. Rimmed alone it is the ring
 * the SDK's circular timer draws; filled and rimmed it is the overlay the game dims its dials
 * through — either written here into the panels the rest of the slot is built from. `tint` tells
 * apart arcs differing only in colour, so two gates cover the whole write.
 */
function writeArc(
	ref: PanelRef,
	x: number,
	y: number,
	size: number,
	thickness: number,
	fill: string,
	rim: string,
	percent: number,
	from: number,
	tint: number
): void {
	const element = ref.element
	if (element === undefined) {
		return
	}
	// the quad carries a pixel of room on every side, where the shader's antialiased edge lands
	writeRect(element, x - 1, y - 1, size + 2, size + 2)
	const shape = MenuSDK.MarkValue(
		element,
		RING_MARK,
		percent + 128 * (from + 128 * thickness)
	)
	const shade = MenuSDK.MarkValue(element, TINT_MARK, tint)
	if (shape || shade) {
		MenuSDK.WriteStyle(
			element,
			"decorator",
			MenuSDK.SdfShape(
				CIRCLE_RADIUS,
				fill,
				MenuSDK.ToLayoutUnits(thickness),
				rim,
				1,
				0,
				"",
				percent,
				from * 3.6
			).decorator ?? ""
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
	public readonly buybackImage = new ClippedImageRef()
	public readonly buybackLabel = new PanelRef()
	public readonly spellGroup = new PanelRef()
	public readonly spellShadow = new IconShadowRef()
	public readonly spellImage = new ClippedImageRef()
	public readonly spellSweep = new PanelRef()
	public readonly spellOutline = new PanelRef()
	public readonly spellCooldown = new PanelRef()
	public readonly spellStacks = new PanelRef()
	public readonly levelBadge = new PanelRef()
	public readonly durationBadge = new PanelRef()
	public readonly levelTicks: PanelImageRef[] = []
	public readonly itemsGroup = new PanelRef()
	public readonly itemImages: ClippedImageRef[] = []
	public readonly itemSweeps: PanelRef[] = []
	public readonly ultimateIcon = new PanelImageRef()

	constructor() {
		for (let i = 0; i < MAX_LEVEL_TICKS; i++) {
			this.levelTicks.push(new PanelImageRef())
		}
		for (let i = 0; i < MAX_ITEMS; i++) {
			this.itemImages.push(new ClippedImageRef())
			this.itemSweeps.push(new PanelRef())
		}
	}

	public Render(key: number): React.ReactElement {
		const spellChildren: React.ReactElement[] = [
			this.spellShadow.Render("shadow"),
			this.spellImage.Render("image"),
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
				style: LABEL_STYLE
			}),
			React.createElement("div", {
				key: "stacks",
				ref: this.spellStacks.attach,
				style: LABEL_STYLE
			}),
			React.createElement("div", {
				key: "level",
				ref: this.levelBadge.attach,
				style: LABEL_STYLE
			}),
			React.createElement("div", {
				key: "duration",
				ref: this.durationBadge.attach,
				style: LABEL_STYLE
			})
		]
		for (let i = 0; i < this.levelTicks.length; i++) {
			spellChildren.push(
				React.createElement("img", {
					key: `tick${i}`,
					ref: this.levelTicks[i].attach,
					style: IMAGE_STYLE
				})
			)
		}
		const itemChildren: React.ReactElement[] = []
		for (let i = 0; i < this.itemImages.length; i++) {
			itemChildren.push(this.itemImages[i].Render(`item${i}`))
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
				style: LABEL_STYLE
			}),
			React.createElement("div", {
				key: "lasthit",
				ref: this.lastHitLabel.attach,
				style: LABEL_STYLE
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
				this.buybackImage.Render("image"),
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
	/** The frame's clock in milliseconds, read once a frame for every fade the panel runs. */
	public static Now = 0
	public static BlackOutManaColor = BLACK_OUT_MANA
	public static BlackOutHealthColor = BLACK_OUT_HEALTH
	public static NoManaAbilitiesColor = NO_MANA_ABILITIES

	public static runeData = RUNE_DATA

	public static HideAll(): void {
		abilityPicker.Hide()
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
	/** How wide the game lays out the well its teleport sits in, 0 while it hands out none. */
	private tpWellSize = 0
	private readonly tpButton = new Rectangle()

	private slot: Nullable<TopPanelSlot>
	private readonly workRect = new Rectangle()
	private readonly itemsRect = new Rectangle()
	private readonly buybackRect = new Rectangle()
	private readonly buybackWork = new Rectangle()
	private readonly pickerAnchor = new Rectangle()

	/** When the ability's icon last came up, on the frame clock; below zero while it is down. */
	private spellShownAt = -1
	/** How far the icon's rim and art have crossed to the no-mana blue: 0 the team's, 1 the blue. */
	private readonly noManaBlend = new Ramp()
	private readonly rimTint = new Color()
	private readonly artTint = new Color()

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
		this.hideSpell(slot)
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
			!(isAlt && this.TeamState(menu.LastHitMenu.Team)) &&
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
			menu.LastHitMenu.TextStyle,
			stroke.x,
			stroke.y,
			stroke.Width,
			stroke.Height,
			fontPx(stroke.Height, isAlt ? 1.8 : 1.3) * STRIP_TEXT_SCALE,
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
		if (hero === undefined || heroImage === undefined || !this.TeamState(menu.Team)) {
			hide(slot.lastHitLabel)
			return
		}
		const stroke = this.getStrokePosition(copyRect(heroImage, this.workRect))
		writeTextBox(
			slot.lastHitLabel,
			menu.TextStyle,
			stroke.x,
			stroke.y,
			stroke.Width,
			stroke.Height,
			fontPx(stroke.Height, 1.3) * STRIP_TEXT_SCALE,
			`${this.player.LastHitCount} / ${this.player.DenyCount}`
		)
	}

	public RenderMana(menu: BarsMenu) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		const stateMP = this.TeamState(menu.TeamMana)
		const stateHP = this.TeamState(menu.TeamHealth)

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
		const stateHP = this.TeamState(menu.TeamHealth)
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
		const position = this.tpIndicator
		if (position === undefined || this.isOpenHudContains(position)) {
			this.hideSpell(slot)
			return
		}

		// the teleport is an item: it rides the Items page and shows whether abilities are drawn or not
		if (this.CanRenderTpScroll(menu, items)) {
			return
		}

		if (!menu.SpellMenu.State.value) {
			this.hideSpell(slot)
			return
		}

		const abilMenu = menu.SpellMenu
		const abilily = this.getAbility(spells, abilMenu, abilMenu.OnlyUlti.value)
		if (abilily === undefined) {
			this.hideSpell(slot)
			return
		}

		const general = menu.General
		const isFormatTime = general.FormatTime.value
		const outlineAllyColor = menu.SpellMenu.OutlineAlly.SelectedColor
		const outlineEnemyColor = menu.SpellMenu.OutlineEnemy.SelectedColor
		const outlineNoManaColor = menu.SpellMenu.OutlineNoMana.SelectedColor
		const isCircle = general.IsCircle
		const style = abilMenu.TextStyle

		const cooldown = abilily.Cooldown
		const cooldownCeil = Math.ceil(cooldown)

		let alpha = 255
		if (cooldown && cooldown <= 0.1) {
			alpha = Math.round((cooldown / 0.1) * 255)
		}

		if (
			!this.Image(
				slot,
				style,
				abilily.TexturePath,
				abilily.ManaCost,
				cooldownCeil,
				abilily.CooldownPercent,
				position,
				isCircle,
				general.IconRadius(Math.min(position.Width, position.Height)),
				outlineAllyColor,
				outlineEnemyColor,
				outlineNoManaColor,
				abilily.StackCount,
				isFormatTime,
				alpha
			)
		) {
			return
		}

		if (general.LevelState.value) {
			this.Level(slot, style, abilily, cooldown, position, isCircle)
		} else {
			hide(slot.levelBadge)
			this.hideTicks(slot)
		}

		if (general.DurationState.value) {
			this.lvlOrChargesOrDuration(
				slot,
				style,
				Math.ceil(abilily.CooldownDuration),
				position,
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
		const stateItems = this.TeamState(itemMenu.Team)
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
		const isCircle = menu.General.IsCircle
		const perRow = Math.max(1, Math.floor((position.Width - imageSize) / step) + 1)
		const reservedCell = perRow + Math.floor(perRow / 2)
		const radius = menu.General.IconRadius(imageSize)

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

			writeClippedImage(
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
					CIRCLE_RADIUS,
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
		if (hero === undefined || !this.TeamState(buyBackMenu.Team)) {
			hide(slot.buybackGroup)
			return
		}
		const buyback = this.buyback
		const barMenu = menu.BarsMenu
		const stateMP = this.TeamState(barMenu.TeamMana)
		const stateHP = this.TeamState(barMenu.TeamHealth)
		if (buyback === undefined) {
			hide(slot.buybackGroup)
			return
		}

		const buybackPosition = copyRect(buyback, this.buybackRect)
		buybackPosition.pos1.y =
			buybackPosition.pos2.y - GUIInfo.ScaleHeight(BUYBACK_STRIP_HEIGHT)

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
		writeFootImage(
			slot.buybackImage,
			ImageData.Icons.buyback_header,
			newPosition.x,
			newPosition.y,
			newPosition.Width,
			newPosition.Height
		)
		writeTextBox(
			slot.buybackLabel,
			menu.Style,
			newPosition.x,
			newPosition.y,
			newPosition.Width,
			newPosition.Height,
			fontPx(newPosition.Height, 1.3) * STRIP_TEXT_SCALE,
			Math.formatTime(cooldown)
		)
	}

	public RenderRune(menu: RunesMenu) {
		const slot = this.slot
		if (slot === undefined) {
			return
		}
		if (!this.TeamState(menu.Team)) {
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

	public TeamState(selection: Menu.MultiSelect) {
		return selection.IsSelected(
			this.player.IsEnemy() ? ETeamState.Enemies : ETeamState.Allies
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

		// the diamond stands for the ability the row ranks first among those turned on, ready or
		// not, so a tick or a drag in the picker shows at once; the ultimate while none is on
		const hero = this.player.Hero
		const spells = menu.SpellMenu
		const abilily =
			this.getAbility(abiliies, spells, spells.OnlyUlti.value, true) ??
			this.getAbility(abiliies, spells, true, true, true) ??
			abiliies.find(ability => ability.IsValid && ability.Owner === hero)
		if (this.isOpenHudContains(basePosition)) {
			hide(slot.ultimateIcon)
			return
		}
		if (abilily === undefined) {
			hide(slot.ultimateIcon)
			return
		}

		const remaining = Math.ceil(abilily.Cooldown)
		const iconWidth = GUIInfo.ScaleWidth(16)
		const iconHeight = GUIInfo.ScaleHeight(16)
		const x = basePosition.x + (basePosition.Width - iconWidth) / 2
		const y = basePosition.y + (basePosition.Height - iconHeight) / 2
		const hitPad = GUIInfo.ScaleHeight(4)
		this.pickerAnchor.pos1.SetVector(x - hitPad, y - hitPad)
		this.pickerAnchor.pos2.SetVector(x + iconWidth + hitPad, y + iconHeight + hitPad)
		abilityPicker.Update(hero, abiliies, this.pickerAnchor, menu.SpellMenu)

		let imageUlti = ""
		if (!(remaining > 0)) {
			imageUlti = ImageData.Icons.ult_ready
		}

		if (remaining !== 0 || abilily.Level === 0) {
			imageUlti = ImageData.Icons.ult_cooldown
		}

		if (this.player.Hero.Mana < abilily.ManaCost) {
			imageUlti = ImageData.Icons.ult_no_mana
		}

		writeImage(slot.ultimateIcon, imageUlti, x, y, iconWidth, iconHeight)
	}

	protected Image(
		slot: TopPanelSlot,
		style: TextStyle,
		texture: string,
		manaCost: number,
		cooldown: number,
		ratio: number,
		position: Rectangle,
		isCircle: boolean,
		radius: number,
		colorOutlineAlly: Color,
		colorOutlineEnemy: Color,
		colorOutlineNoMana: Color,
		stackCount = 0,
		formatTime = false,
		alpha = 255
	): boolean {
		const hero = this.player.Hero
		if (hero === undefined || !(cooldown > 0)) {
			this.hideSpell(slot)
			return false
		}

		const noMana = hero.Mana < manaCost && this.IsAlive
		const group = slot.spellGroup.element
		if (group !== undefined) {
			const reveal = this.revealSpell(group, noMana)
			MenuSDK.WriteFmt(
				group,
				"opacity",
				Math.round(reveal * (alpha / 255) * 100) / 100,
				""
			)
		}
		// the rim and the art cross to the no-mana blue and back over a fade rather than flipping
		const blend = this.noManaBlend.Toward(
			noMana ? 1 : 0,
			GUIPlayer.Now,
			fadeDuration()
		)
		const x = position.x
		const y = position.y
		const width = position.Width
		const height = position.Height

		// the game's top bar icons stand on a soft shadow; ours is laid before the art
		writeIconShadow(
			slot.spellShadow,
			x,
			y,
			width,
			height,
			isCircle ? CIRCLE_RADIUS : radius
		)

		writeClippedImage(slot.spellImage, texture, x, y, width, height, radius)
		this.tintArt(slot, blend)

		const outlineColor = mixColor(
			hero.IsEnemy() ? colorOutlineEnemy : colorOutlineAlly,
			colorOutlineNoMana,
			blend,
			this.rimTint
		)
		// the game rings its top bar icons with 2px, and so does every other outline the SDK draws
		const outlinePx = Math.max(1, Math.ceil(GUIInfo.ScaleHeight(2)))
		const outline = slot.spellOutline.element
		if (outline !== undefined) {
			// Leave room for the antialiased edge, as on the teleport ring.
			writeRect(outline, x - 1, y - 1, width + 2, height + 2)
			// the teleport's ring shares this panel and gates on the shape mark, so that is
			// cleared for it; clearing it also tells this outline the ring was drawn over it
			const relaid = MenuSDK.MarkValue(outline, RING_MARK, -1)
			// the colour, the shape, the rim's width and the corner, packed into one number
			const retinted = MenuSDK.MarkValue(
				outline,
				OUTLINE_MARK,
				((outlineColor.toUint32() * 2 + (isCircle ? 1 : 0)) * 256 + outlinePx) *
					512 +
					(isCircle ? 0 : radius)
			)
			if (relaid || retinted) {
				const rim = MenuSDK.CssColor(outlineColor, 255)
				// the shader reads a border in layout units, as the teleport's ring does
				const border = MenuSDK.ToLayoutUnits(outlinePx)
				MenuSDK.WriteStyle(
					outline,
					"decorator",
					(isCircle
						? MenuSDK.SdfCircle(TRANSPARENT, border, rim, 1)
						: MenuSDK.SdfShape(
								MenuSDK.ToLayoutUnits(radius),
								TRANSPARENT,
								border,
								rim,
								1
							)
					).decorator ?? ""
				)
			}
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
				isCircle ? CIRCLE_RADIUS : radius,
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
			writeTextBox(
				slot.spellCooldown,
				style,
				x,
				y,
				width,
				height,
				Math.round(Math.min(width, height) * ICON_TEXT_SIZE),
				text
			)
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
		writeTextBox(
			slot.spellCooldown,
			style,
			x,
			y,
			width,
			half,
			fontPx(half, division),
			text
		)

		const stackCountStr =
			stackCount >= 1000
				? `${(stackCount / 1000).toFixed(1)}k`
				: stackCount.toString()

		const stacks = slot.spellStacks.element
		if (stacks !== undefined) {
			const stackSize = fontPx(half, division)
			writeRect(stacks, x, y + half, width, half)
			writeLine(stacks, stackSize, writeType(stacks, style, stackSize), style)
			MenuSDK.WriteText(stacks, stackCountStr)
			MenuSDK.WriteShown(stacks, true)
		}
		return true
	}

	/**
	 * The teleport as the game's own top bar draws it: the scroll cut to a disc, a ring on its rim
	 * filling clockwise as the cooldown runs out, the part of the dial still to come dimmed under
	 * a black band from where the ring ends round to twelve, and what is left of the cooldown
	 * read over the middle. The circular backing closes the gap between the scroll and the ring.
	 */
	protected TpCircle(
		slot: TopPanelSlot,
		style: TextStyle,
		item: Item,
		cdSource: Item,
		position: Rectangle,
		cooldown: number,
		formatTime: boolean
	) {
		const hero = this.player.Hero
		if (hero === undefined) {
			this.hideSpell(slot)
			return
		}

		const noMana = hero.Mana < cdSource.ManaCost && this.IsAlive
		const group = slot.spellGroup.element
		if (group !== undefined) {
			const reveal = this.revealSpell(group, noMana)
			MenuSDK.WriteFmt(group, "opacity", Math.round(reveal * 100) / 100, "")
		}
		const blend = this.noManaBlend.Toward(
			noMana ? 1 : 0,
			GUIPlayer.Now,
			fadeDuration()
		)

		// whole pixels from the start, so the ring and the scroll inset from the button sit on
		// its centre with the same gap on every side; a half pixel goes up and left, the way
		// Panorama lays its own button 6 into the 51 wide well at 1080p
		const size = Math.round(Math.min(position.Width, position.Height))
		const x = Math.floor(position.x + (position.Width - size) / 2)
		const y = Math.floor(position.y + (position.Height - size) / 2)

		writeIconShadow(slot.spellShadow, x, y, size, size, CIRCLE_RADIUS)

		// the scroll sits in from the box's edge, its rim under the band the overlay carries
		const artInset = Math.round(size * TP_ART_MARGIN)
		const artSize = size - 2 * artInset
		writeClippedImage(
			slot.spellImage,
			item.TexturePath,
			x + artInset,
			y + artInset,
			artSize,
			artSize,
			Math.round(artSize / 2)
		)
		this.tintArt(slot, blend)

		// Fill clockwise as cooldown recovers. Round up the scaled Panorama border so a
		// subpixel rim does not lose its solid core to antialiasing at the normal HUD size.
		const recovered = Math.round(100 - Math.clamp(cdSource.CooldownPercent, 0, 100))
		const ringInset = Math.round(size * TP_RING_MARGIN)
		const ringWidth = Math.max(1, Math.ceil(size * TP_RING_WIDTH))
		const ringColor = mixColor(TP_RING, TP_RING_NO_MANA, blend, this.rimTint)
		writeArc(
			slot.spellOutline,
			x + ringInset,
			y + ringInset,
			size - 2 * ringInset,
			ringWidth,
			TRANSPARENT,
			MenuSDK.CssColor(ringColor, 255),
			recovered,
			0,
			ringColor.toUint32()
		)

		// the rest of the dial dims from where the ring ends round to twelve, under a black band
		// at the rim; the abilities' sweep shares the panel and gates on a mark of its own, so
		// that is cleared for it to lay its own decorator afresh once the scroll is gone
		const sweep = slot.spellSweep.element
		if (recovered < 100 && sweep !== undefined) {
			writeArc(
				slot.spellSweep,
				x,
				y,
				size,
				Math.max(1, Math.round(size * TP_TRACK_WIDTH)),
				MenuSDK.CssColor(Color.Black, TP_DIAL_SHADE),
				TP_TRACK,
				100 - recovered,
				recovered,
				TP_DIAL_SHADE
			)
			MenuSDK.MarkValue(sweep, SWEEP_MARK, -1)
		} else {
			hide(slot.spellSweep)
		}
		hide(slot.spellStacks)

		if (!(cooldown > 0)) {
			hide(slot.spellCooldown)
			return
		}

		writeTextBox(
			slot.spellCooldown,
			style,
			x,
			y,
			size,
			size,
			Math.round(size * ICON_TEXT_SIZE),
			formatTime && cooldown > 60 ? Math.formatTime(cooldown) : cooldown.toFixed()
		)
	}

	protected CanRenderTpScroll(menu: MenuManager, items: Item[]) {
		const slot = this.slot
		if (slot === undefined) {
			return false
		}
		const itemMenu = menu.ItemMenu
		if (!this.TeamState(itemMenu.Team) || !GUIPlayer.IsAltDown) {
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
		// the teleport rides the ability slot, so it is set in the abilities' type
		const style = menu.SpellMenu.TextStyle

		const button = this.tpButtonBox(position)
		this.TpCircle(slot, style, item, cdSource, button, cooldown, isFormatTime)

		if (chargeState) {
			this.lvlOrChargesOrDuration(slot, style, item.CurrentCharges, button)
		} else {
			hide(slot.durationBadge)
		}

		hide(slot.levelBadge)
		this.hideTicks(slot)
		return true
	}

	/**
	 * The game's teleport button: 48 units of the 64-unit well, on the centre of the box the
	 * ability icons sit in. The size comes from the well, not from that box, which is only
	 * ABILITY_BOX of it.
	 */
	private tpButtonBox(position: Rectangle): Rectangle {
		const size =
			this.tpWellSize > 0
				? (this.tpWellSize * TP_BUTTON) / TP_WELL
				: Math.min(position.Width, position.Height)
		const box = this.tpButton
		box.pos1.x = position.x + (position.Width - size) / 2
		box.pos1.y = position.y + (position.Height - size) / 2
		box.pos2.x = box.pos1.x + size
		box.pos2.y = box.pos1.y + size
		return box
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

		// with ALT held the game puts up its own strip for an ally, in this very place; the items
		// below still make room for it
		if (!this.player.IsEnemy() && GUIPlayer.IsAltDown) {
			hide(slot.buybackGroup)
			return
		}

		show(slot.buybackGroup)
		if (!this.IsAlive) {
			writeFootImage(
				slot.buybackImage,
				ImageData.Icons.buyback_header,
				newPosition.x,
				newPosition.y,
				newPosition.Width,
				newPosition.Height
			)
			return
		}
		// the strip under the bars, cut from the art the way the game's mana bar leaves it
		const strip = GUIInfo.ScaleHeight(BUYBACK_STRIP_HEIGHT)
		writeFootImage(
			slot.buybackImage,
			ImageData.Icons.buyback_topbar_alive,
			newPosition.x,
			newPosition.y + newPosition.Height - strip,
			newPosition.Width,
			strip,
			GUIInfo.ScaleHeight(BUYBACK_ART_HEIGHT)
		)
	}

	protected Level(
		slot: TopPanelSlot,
		style: TextStyle,
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
		this.lvlOrChargesOrDuration(slot, style, abilily.Level, position, true)
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

	/** Takes the ability's icon down, so it comes up faded in the next time it is drawn. */
	private hideSpell(slot: TopPanelSlot) {
		hide(slot.spellGroup)
		this.spellShownAt = -1
	}

	/**
	 * Puts the ability's icon up and answers how far up it is: nothing the frame it first comes
	 * up, whole once a fade has passed. `noMana` is the shade it is to come up in — an icon that
	 * appears already short of mana is blue from the start rather than crossing over from the
	 * team's colour while it fades in.
	 */
	private revealSpell(group: HTMLElement, noMana: boolean): number {
		const now = GUIPlayer.Now
		if (this.spellShownAt < 0) {
			this.spellShownAt = now
			this.noManaBlend.Set(noMana ? 1 : 0)
		}
		MenuSDK.WriteShown(group, true)
		return MenuSDK.EaseValue(
			MenuSDK.Ease.Out,
			Math.min(1, (now - this.spellShownAt) / fadeDuration())
		)
	}

	/** Tints the icon's art `blend` of the way from its own colours to the no-mana blue. */
	private tintArt(slot: TopPanelSlot, blend: number) {
		const image = slot.spellImage.image.element
		if (image === undefined) {
			return
		}
		if (MenuSDK.MarkValue(image, TINT_MARK, Math.round(blend * 255))) {
			MenuSDK.WriteStyle(
				image,
				"image-color",
				MenuSDK.CssColor(
					mixColor(PLAIN_ART, NO_MANA_ABILITIES, blend, this.artTint),
					255
				)
			)
		}
	}

	private hideTicks(slot: TopPanelSlot) {
		for (const tick of slot.levelTicks) {
			hide(tick)
		}
	}

	private lvlOrChargesOrDuration(
		slot: TopPanelSlot,
		style: TextStyle,
		value: number,
		recPosition: Rectangle,
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
		writeLine(
			element,
			width,
			writeType(element, style, fontPx(width, value >= 100 ? 2 : 1.2)),
			style
		)
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
			MenuSDK.WriteSizedArt(
				element,
				ImageData.Icons.levelup_button_3,
				Math.round(levelDrawWidth),
				Math.round(levelHeight)
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

		// the box the ability icons sit in, taken off the game's well (ABILITY_BOX); the teleport
		// takes its centre and sizes its button from the well itself (tpButtonBox)
		const well = isDire
			? topBar.DirePlayersTPIndicators[teamSlot]
			: topBar.RadiantPlayersTPIndicators[teamSlot]
		this.tpWellSize = well !== undefined ? Math.min(well.Width, well.Height) : 0

		const baseTp = well?.Clone()
		if (baseTp !== undefined) {
			const insetX = (baseTp.Width * (1 - ABILITY_BOX)) / 2
			const insetY = (baseTp.Height * (1 - ABILITY_BOX)) / 2
			baseTp.pos1.x += insetX
			baseTp.pos1.y += insetY
			baseTp.pos2.x -= insetX
			baseTp.pos2.y -= insetY
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
		// GUIInfo hands out no rectangle for a panel the game is not laying out, so the shop
		// and the scoreboard read undefined while they are folded away
		if (InputManager.IsShopOpen) {
			const mini = GUIInfo.OpenShopMini.GuideFlyout,
				large = GUIInfo.OpenShopLarge.GuideFlyout
			if (
				(mini !== undefined && mini.Contains(position.pos1)) ||
				(large !== undefined && large.Contains(position.pos1))
			) {
				return true
			}
		}

		if (InputManager.IsScoreboardOpen) {
			const board = GUIInfo.Scoreboard.Background
			if (board !== undefined && board.Contains(position.pos1)) {
				return true
			}
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

	/**
	 * The ability the panel shows for the hero: the pinned one while a single tile of the row is
	 * on, else the first in the row's order that is on - on cooldown unless `ignoreCooldown`, an
	 * ultimate when `onlyUltimate`. `ignoreEnabled` reads the order alone, for a lookup the ticks
	 * do not gate. A passive ultimate has no tile and counts as on, ranked before the row; anything
	 * else the row does not name ranks after it.
	 */
	private getAbility(
		arr: Ability[],
		menu: SpellMenu,
		onlyUltimate = false,
		ignoreCooldown = false,
		ignoreEnabled = false
	) {
		const hero = this.player.Hero
		const selector = hero === undefined ? undefined : menu.SelectorOf(hero)
		if (!ignoreEnabled && hero !== undefined) {
			const selected = menu.SelectedAbility(hero, arr)
			if (selected !== undefined) {
				return ignoreCooldown || selected.Cooldown > 0 ? selected : undefined
			}
		}
		let best: Nullable<Ability>
		let bestRank = Infinity
		for (let i = 0, end = arr.length; i < end; i++) {
			const x = arr[i]
			const isUltimate = x.IsUltimate
			if ((onlyUltimate && !isUltimate) || (!ignoreCooldown && !(x.Cooldown > 0))) {
				continue
			}
			const priority = selector?.GetPriority(x.Name) ?? -1
			if (
				!ignoreEnabled &&
				!(isUltimate && x.IsPassive) &&
				!(priority >= 0 && selector !== undefined && selector.IsEnabled(x.Name))
			) {
				continue
			}
			const rank = priority >= 0 ? priority : isUltimate ? -1 : Infinity
			if (best === undefined || rank < bestRank) {
				best = x
				bestRank = rank
			}
		}
		return best
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
