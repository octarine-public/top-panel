import { ETextEffect } from "../enums/ETextEffect"
import { TopPanelIcons } from "./icons"

/** Hands out the stamps {@link TextStyleMenu.Version} answers with, so no two styles share one. */
let stamps = 0

/**
 * The type a group of labels is set in: a family, a size relative to the label's own box, a
 * weight, a colour and the shade under the glyphs. The page-wide one is a tab of its own; a
 * page that carries its own is a "Text settings" section with an "Override" switch, and reads
 * the page-wide one until that is on.
 */
export class TextStyleMenu {
	public readonly Node: Menu.Node
	public readonly Override: Nullable<Menu.Toggle>
	public readonly Font: Menu.Dropdown
	public readonly Size: Menu.Slider
	public readonly Weight: Menu.Dropdown
	public readonly Color: Menu.ColorPicker
	public readonly Effect: Menu.Dropdown
	public readonly EffectColor: Menu.ColorPicker
	public readonly EffectOpacity: Menu.Slider

	private readonly families = MenuSDK.MenuFontFamilies()
	private readonly weights = [400, 600, 700]

	private stamp = ++stamps
	private fontEpoch = MenuSDK.FontEpoch()

	constructor(
		parent: Menu.Node,
		private readonly shared?: TextStyleMenu
	) {
		const node =
			shared === undefined
				? parent.AddNode("Style", TopPanelIcons.Style)
				: parent.AddSettings("Text settings", TopPanelIcons.Style)
		this.Node = node
		node.SortNodes = false
		if (shared !== undefined) {
			this.Override = node.AddToggle(
				"Override",
				false,
				"Use separate text settings for this element"
			)
		}
		this.Font = node.AddDropdown("Font", ["Default", ...this.families])
		this.Font.IconPath = TopPanelIcons.Font
		this.Size = node.AddSlider(
			"Text size",
			100,
			70,
			150,
			0,
			"Scales cooldowns, counters and badges relative to their box"
		)
		this.Size.Suffix = "%"
		this.Size.IconPath = TopPanelIcons.TextSize
		this.Weight = node.AddDropdown("Weight", ["Regular", "Semi-bold", "Bold"], 1)
		this.Weight.IconPath = TopPanelIcons.Font
		this.Color = node.AddColorPicker("Text color", Color.White).SolidOnly()
		this.Color.IconPath = TopPanelIcons.Palette
		this.Effect = node.AddDropdown(
			"Under text",
			["None", "Shadow", "Outline", "Soft shadow"],
			ETextEffect.Outline
		)
		this.Effect.IconPath = TopPanelIcons.TextEffect
		this.EffectColor = node.AddColorPicker("Effect color", Color.Black).SolidOnly()
		this.EffectColor.IconPath = TopPanelIcons.Palette
		this.EffectOpacity = node.AddSlider("Text shade opacity", 100, 0, 100)
		this.EffectOpacity.Suffix = "%"
		this.EffectOpacity.IconPath = TopPanelIcons.Opacity
		const sync = () => {
			const inherited = this.Override !== undefined && !this.Override.value
			this.Font.IsHidden = this.Size.IsHidden = this.Weight.IsHidden = inherited
			this.Color.IsHidden = this.Effect.IsHidden = inherited
			this.EffectColor.IsHidden = this.EffectOpacity.IsHidden =
				inherited || this.Effect.SelectedID === ETextEffect.None
			node.Update()
		}
		this.Effect.OnValue(sync)
		this.Override?.OnValue(sync)
		sync()
		const restamp = () => {
			this.stamp = ++stamps
		}
		this.Font.OnValue(restamp)
		this.Size.OnValue(restamp)
		this.Weight.OnValue(restamp)
		this.Color.OnValue(restamp)
		this.Effect.OnValue(restamp)
		this.EffectColor.OnValue(restamp)
		this.EffectOpacity.OnValue(restamp)
		this.Override?.OnValue(restamp)
	}

	/** The style the labels are drawn in: this one when it overrides, the page-wide one otherwise. */
	public get Effective(): TextStyleMenu {
		return this.shared !== undefined && !this.Override?.value ? this.shared : this
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

	public get FontFamily(): string {
		return this.families[this.Font.SelectedID - 1] ?? MenuSDK.Theme.FontFamily
	}

	public get FontWeight(): number {
		return this.weights[this.Weight.SelectedID] ?? 600
	}

	/** The factor the size slider scales a label's design size by. */
	public get Scale(): number {
		return this.Size.value / 100
	}

	/** The shade under the glyphs as an RmlUi colour: the effect colour at the opacity slider. */
	public get Shade(): string {
		return MenuSDK.CssColor(
			this.EffectColor.SelectedColor,
			Math.round((this.EffectOpacity.value / 100) * 255)
		)
	}
}
