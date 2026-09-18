import { ETextEffect } from "../enums/ETextEffect"
import { TopPanelIcons } from "./icons"

/** Hands out the stamps {@link TextStyle.Version} answers with, so no two styles share one. */
let stamps = 0

/** The weights the menu's three names stand for, under the same index. */
const WEIGHTS = [400, 600, 700]

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
	public get FontFamily(): string {
		return MenuSDK.Theme.FontFamily
	}

	public get FontWeight(): number {
		return 700
	}

	public get Scale(): number {
		return 0.93
	}

	public get Color(): string {
		return MenuSDK.CssColor(Color.White, 255)
	}

	public get Effect(): ETextEffect {
		return ETextEffect.None
	}

	public get Shade(): string {
		return MenuSDK.CssColor(Color.Black, 255)
	}
}

/**
 * The type every label of the panel is set in: the menu's own face, bold, white, bare, and a
 * shade under the box it is written in. It is the panel's own, with no rows to move it.
 */
export const BaseTextStyle: TextStyle = new FixedTextStyle()

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
			93,
			70,
			150,
			0,
			"Scales cooldowns, counters and badges relative to their box"
		)
		this.size.Suffix = "%"
		this.size.IconPath = TopPanelIcons.TextSize
		this.weight = node.AddDropdown("Weight", ["Regular", "Semi-bold", "Bold"], 2)
		this.weight.IconPath = TopPanelIcons.Font
		this.color = node.AddColorPicker("Text color", Color.White).SolidOnly()
		this.color.IconPath = TopPanelIcons.Palette
		this.effect = node.AddDropdown(
			"Under text",
			["None", "Shadow", "Outline", "Soft shadow"],
			ETextEffect.None
		)
		this.effect.IconPath = TopPanelIcons.TextEffect
		this.effectColor = node.AddColorPicker("Effect color", Color.Black).SolidOnly()
		this.effectColor.IconPath = TopPanelIcons.Palette
		this.effectOpacity = node.AddSlider("Text shade opacity", 100, 0, 100)
		this.effectOpacity.Suffix = "%"
		this.effectOpacity.IconPath = TopPanelIcons.Opacity
		const sync = () => {
			const inherited = !this.Override.value
			this.font.IsHidden = this.size.IsHidden = this.weight.IsHidden = inherited
			this.color.IsHidden = this.effect.IsHidden = inherited
			this.effectColor.IsHidden = this.effectOpacity.IsHidden =
				inherited || this.effect.SelectedID === ETextEffect.None
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
		this.Override.OnValue(restamp)
	}

	/** The style the labels are drawn in: this one when it overrides, the panel's own otherwise. */
	public get Effective(): TextStyle {
		return this.Override.value ? this : this.shared
	}

	public get FontFamily(): string {
		return this.families[this.font.SelectedID - 1] ?? MenuSDK.Theme.FontFamily
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
		return this.effectOpacity.value > 0 ? this.effect.SelectedID : ETextEffect.None
	}

	public get Shade(): string {
		return MenuSDK.CssColor(
			this.effectColor.SelectedColor,
			Math.round((this.effectOpacity.value / 100) * 255)
		)
	}
}
