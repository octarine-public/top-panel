import { ETextEffect } from "../enums/ETextEffect"
import { TopPanelIcons } from "./icons"

/** Hands out the stamps {@link TextStyle.Version} answers with, so no two styles share one. */
let stamps = 0

/** The weights the menu's three names stand for, under the same index. */
const WEIGHTS = [400, 600, 700]

/**
 * How high above the middle of its line a face stands its digits, as a share of the size. A line
 * box is centred on the face's own ascender and descender, not on the glyphs: where the ascender
 * reaches further above the baseline than the descender falls below it, the reading ends up
 * sitting high in the box by half that difference less half the cap height. Radiance, the face
 * the panel loads out of the game, carries `hhea` 857/-344 against a cap of 672 per 1000 em,
 * which is a full pixel at the size a top bar icon asks for. A face the menu hands out is left
 * alone: the ones it ships are cut evenly enough to centre on their own.
 */
const CAP_SHIFTS = new Map<string, number>([["Radiance", (672 - (857 - 344)) / 2000]])

/**
 * The type a group of labels is set in: a family, a size relative to the label's own box, a
 * weight, a colour and the shade under the glyphs. The panel sets every label in the one type
 * {@link BaseTextStyle} names; a page that carries its own is a "Text settings" section with an
 * "Override" switch, and reads the base one until that is on.
 */
export abstract class TextStyle {
	private stamp = ++stamps
	private fontEpoch = MenuSDK.FontEpoch()

	public abstract get FontFamily(): string
	public abstract get FontWeight(): number
	/** The factor a label's design size is scaled by. */
	public abstract get Scale(): number
	/** The colour of the glyphs as an RmlUi colour. */
	public abstract get Color(): string
	/** The shade laid under the glyphs, {@link ETextEffect.None} where none of it would show. */
	public abstract get Effect(): ETextEffect
	/** The colour of that shade as an RmlUi colour. */
	public abstract get Shade(): string
	public get ShadowShade(): string {
		return this.Shade
	}
	public get EffectOpacity(): number {
		return 100
	}
	/** Blur radius in pixels for the soft shadow. */
	public get ShadowBlur(): number {
		return 2
	}

	/**
	 * The share of its size a label set in this type has to be let down by to stand its glyphs on
	 * the middle of its box rather than its line there. Zero for every face but the ones
	 * {@link CAP_SHIFTS} names.
	 */
	public get CapShift(): number {
		return CAP_SHIFTS.get(this.FontFamily) ?? 0
	}

	/**
	 * A stamp standing for everything a label written in this style reads off it. It moves when one
	 * of the rows moves and when the menu's own typeface does, and no two styles ever share one — so
	 * a writer that pins the type onto an element can compare this alone and write nothing while it
	 * stands still, override switched to another style included.
	 */
	public get Version(): number {
		const epoch = MenuSDK.FontEpoch()
		if (epoch !== this.fontEpoch) {
			this.fontEpoch = epoch
			this.stamp = ++stamps
		}
		return this.stamp
	}

	/** Moves the stamp, so every label set in this type is written anew. */
	protected Restamp(): void {
		this.stamp = ++stamps
	}
}

/** The type the panel sets a label in with no page of its own to say otherwise. */
class FixedTextStyle extends TextStyle {
	constructor(
		private readonly options: {
			family?: string
			weight?: number
			effect?: ETextEffect
			shadowBlur?: number
			scale?: number
			effectOpacity?: number
		} = {}
	) {
		super()
	}

	public get FontFamily(): string {
		return this.options.family ?? MenuSDK.Theme.FontFamily
	}

	public get FontWeight(): number {
		return this.options.weight ?? 700
	}

	public get Scale(): number {
		return this.options.scale ?? 0.93
	}

	public get Color(): string {
		return MenuSDK.CssColor(Color.White, 255)
	}

	public get Effect(): ETextEffect {
		return this.options.effect ?? ETextEffect.None
	}

	public override get ShadowBlur(): number {
		return this.options.shadowBlur ?? 2
	}

	public override get EffectOpacity(): number {
		return this.options.effectOpacity ?? 100
	}

	public override get ShadowShade(): string {
		return MenuSDK.CssColor(Color.Black, 255)
	}

	public get Shade(): string {
		return MenuSDK.CssColor(Color.Black, Math.round((this.EffectOpacity / 100) * 255))
	}
}

/**
 * The type every label of the panel is set in: the menu's own face, bold, white, bare, and a
 * shade under the box it is written in. It is the panel's own, with no rows to move it.
 */
export const BaseTextStyle: TextStyle = new FixedTextStyle()

/** Radiance Bold at full size, with an 80% outline and a full-opacity soft shadow. */
export const LastHitTextStyle: TextStyle = new FixedTextStyle({
	family:
		typeof LoadFont === "function" &&
		LoadFont("panorama/fonts/radiance-bold.otf", false, 700)
			? "Radiance"
			: undefined,
	weight: 700,
	scale: 1,
	effect: ETextEffect.OutlineSoftShadow,
	effectOpacity: 80,
	shadowBlur: 4
})

/**
 * The type the game sets the reading over a top bar icon in: Radiance semi-bold at the size the
 * icon asks for, white, over the soft black the game blurs under it — `#TopBarTPIcon
 * #CooldownTimer{font-weight: semi-bold; font-size: 20px}` over `#CooldownTimer`'s own
 * `color: white; text-shadow: 0px 0px 6px 6 #000000`.
 */
export const IconTextStyle: TextStyle = new FixedTextStyle({
	family:
		typeof LoadFont === "function" &&
		LoadFont("panorama/fonts/radiance-semibold.otf", false, 600)
			? "Radiance"
			: undefined,
	weight: 600,
	scale: 1,
	effect: ETextEffect.Glow
})

/** The type one page sets its labels in: {@link BaseTextStyle} until its "Override" switch is on. */
export class TextStyleMenu extends TextStyle {
	public readonly Node: Menu.Node
	public readonly Override: Menu.Toggle

	private readonly font: Menu.Dropdown
	private readonly size: Menu.Slider
	private readonly weight: Menu.Dropdown
	private readonly color: Menu.ColorPicker
	private readonly effect: Menu.Dropdown
	private readonly effectColor: Menu.ColorPicker
	private readonly effectOpacity: Menu.Slider
	private readonly shadowOpacity: Menu.Slider

	private readonly families = MenuSDK.MenuFontFamilies()

	constructor(
		parent: Menu.Node,
		private readonly shared: TextStyle = BaseTextStyle
	) {
		super()
		const node = parent.AddSettings("Text settings", TopPanelIcons.Style)
		this.Node = node
		node.SortNodes = false
		this.Override = node.AddToggle(
			"Override",
			false,
			"Use separate text settings for this element"
		)
		this.font = node.AddDropdown("Font", ["Default", ...this.families])
		this.font.IconPath = TopPanelIcons.Font
		this.size = node.AddSlider(
			"Text size",
			Math.round(shared.Scale * 100),
			70,
			150,
			0,
			"Scales cooldowns, counters and badges relative to their box"
		)
		this.size.Suffix = "%"
		this.size.IconPath = TopPanelIcons.TextSize
		this.weight = node.AddDropdown(
			"Weight",
			["Regular", "Semi-bold", "Bold"],
			WEIGHTS.indexOf(shared.FontWeight)
		)
		this.weight.IconPath = TopPanelIcons.Font
		this.color = node.AddColorPicker("Text color", Color.White).SolidOnly()
		this.color.IconPath = TopPanelIcons.Palette
		this.effect = node.AddDropdown(
			"Under text",
			["None", "Shadow", "Outline", "Soft shadow", "Outline + soft shadow", "Glow"],
			shared.Effect
		)
		this.effect.IconPath = TopPanelIcons.TextEffect
		this.effectColor = node.AddColorPicker("Effect color", Color.Black).SolidOnly()
		this.effectColor.IconPath = TopPanelIcons.Palette
		this.effectOpacity = node.AddSlider(
			"Text shade opacity",
			shared.EffectOpacity,
			0,
			100
		)
		this.effectOpacity.Suffix = "%"
		this.effectOpacity.IconPath = TopPanelIcons.Opacity
		this.shadowOpacity = node.AddSlider("Soft shadow opacity", 100, 0, 100)
		this.shadowOpacity.Suffix = "%"
		this.shadowOpacity.IconPath = TopPanelIcons.Opacity
		const sync = () => {
			const inherited = !this.Override.value
			this.font.IsHidden = this.size.IsHidden = this.weight.IsHidden = inherited
			this.color.IsHidden = this.effect.IsHidden = inherited
			this.effectColor.IsHidden = this.effectOpacity.IsHidden =
				inherited || this.effect.SelectedID === ETextEffect.None
			this.shadowOpacity.IsHidden =
				inherited || this.effect.SelectedID !== ETextEffect.OutlineSoftShadow
			node.Update()
		}
		this.effect.OnValue(sync)
		this.Override.OnValue(sync)
		sync()
		const restamp = () => this.Restamp()
		this.font.OnValue(restamp)
		this.size.OnValue(restamp)
		this.weight.OnValue(restamp)
		this.color.OnValue(restamp)
		this.effect.OnValue(restamp)
		this.effectColor.OnValue(restamp)
		this.effectOpacity.OnValue(restamp)
		this.shadowOpacity.OnValue(restamp)
		this.Override.OnValue(restamp)
	}

	/** The style the labels are drawn in: this one when it overrides, the panel's own otherwise. */
	public get Effective(): TextStyle {
		return this.Override.value ? this : this.shared
	}

	public get FontFamily(): string {
		return this.families[this.font.SelectedID - 1] ?? this.shared.FontFamily
	}

	public override get ShadowBlur(): number {
		return this.shared.ShadowBlur
	}

	public get FontWeight(): number {
		return WEIGHTS[this.weight.SelectedID] ?? 600
	}

	public get Scale(): number {
		return this.size.value / 100
	}

	public get Color(): string {
		return MenuSDK.CssColor(this.color.SelectedColor, 255)
	}

	/** The shade the rows ask for, and none at all once its opacity is slid to nothing. */
	public get Effect(): ETextEffect {
		return this.effectOpacity.value > 0 ||
			(this.effect.SelectedID === ETextEffect.OutlineSoftShadow &&
				this.shadowOpacity.value > 0)
			? this.effect.SelectedID
			: ETextEffect.None
	}

	public override get EffectOpacity(): number {
		return this.effectOpacity.value
	}

	public override get ShadowShade(): string {
		return this.effect.SelectedID === ETextEffect.OutlineSoftShadow
			? MenuSDK.CssColor(
					this.effectColor.SelectedColor,
					Math.round((this.shadowOpacity.value / 100) * 255)
				)
			: this.Shade
	}

	public get Shade(): string {
		return MenuSDK.CssColor(
			this.effectColor.SelectedColor,
			Math.round((this.effectOpacity.value / 100) * 255)
		)
	}
}
