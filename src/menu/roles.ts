import { ERoleMode } from "../enums/ERoleMode"
import { TopPanelIcons } from "./icons"
import { RolePickTextStyle, RoleTopBarTextStyle, TextStyle, TextStyleMenu } from "./style"

export class RolesMenu {
	public readonly State: Menu.Toggle
	public readonly Mode: Menu.Dropdown
	public readonly IconSize: Menu.Slider
	public readonly IconColorState: Menu.Toggle
	public readonly Style: TextStyleMenu
	private readonly Tree: Menu.Node
	private readonly iconColor: Menu.ColorPicker

	constructor(menu: Menu.Node) {
		this.Tree = menu.AddNode(
			"Roles",
			TopPanelIcons.Roles,
			"Enemy roles they queued for,\nin hero selection and before the horn"
		)
		this.Tree.SortNodes = false
		// enemies only: the game shows an ally's role on its own
		this.State = this.Tree.AddToggle("State", true)
		this.Tree.HeaderControl = this.State
		this.Mode = this.Tree.AddDropdown(
			"Display",
			["Text", "Icons"],
			ERoleMode.Text,
			"A single role by name or by icon;\nseveral roles always stand as icons"
		)
		this.Mode.IconPath = TopPanelIcons.Shape
		this.IconSize = this.Tree.AddSlider(
			"Icon size",
			100,
			50,
			200,
			0,
			"Scales the role icons\nfrom the size they stand at by default"
		)
		this.IconSize.Suffix = "%"
		this.IconSize.IconPath = TopPanelIcons.TextSize
		this.IconColorState = this.Tree.AddToggle(
			"Icon color",
			false,
			"Tint the role icons in a colour of your own\ninstead of the game's grey"
		)
		this.IconColorState.IconPath = TopPanelIcons.Palette
		this.iconColor = this.Tree.AddColorPicker(
			"Role icon color",
			new Color(0xd0, 0xd0, 0xd0)
		).SolidOnly()
		this.IconColorState.PairColors(this.iconColor)
		// the names are set in the game's own type for where they stand until overridden
		this.Style = new TextStyleMenu(this.Tree, RoleTopBarTextStyle)

		// the names' type stands only under text, the icons' size and colour only under icons
		const sync = () => {
			const isText = this.IsText
			this.Style.Node.IsHidden = !isText
			this.IconSize.IsHidden = this.IconColorState.IsHidden = isText
			this.Tree.Update()
		}
		this.Mode.OnValue(sync)
		sync()
	}

	public get IsText(): boolean {
		return this.Mode.SelectedID === ERoleMode.Text
	}

	/** The tint the icons are washed in, none while the game's own grey is kept. */
	public get IconColor(): Nullable<string> {
		return this.IconColorState.value
			? MenuSDK.CssColor(this.iconColor.SelectedColor, 255)
			: undefined
	}

	/** The type a role's name is set in under the roster card (`picking`) or over the top bar. */
	public TextStyle(picking: boolean): TextStyle {
		if (this.Style.Override.value) {
			return this.Style
		}
		return picking ? RolePickTextStyle : RoleTopBarTextStyle
	}
}
