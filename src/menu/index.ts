import { ImageData, Menu } from "github.com/octarine-public/wrapper/index"

import { EPopularSettings } from "../enums/EPopularSettings"
import { BarsMenu } from "./bars"
import { MenuBuyBack } from "./buyBack"
import { ItemsMenu } from "./items"
import { LastHitMenu } from "./lastHit"
import { RunesMenu } from "./runes"
import { SpellMenu } from "./spells"

class GeneralSettings {
	public readonly FowTime: Menu.Toggle
	public readonly ModeImages: Menu.Dropdown
	public readonly LevelState: Menu.Toggle
	public readonly FormatTime: Menu.Toggle
	public readonly ChargeState: Menu.Toggle
	public readonly DurationState: Menu.Toggle
	public readonly PopularSettings: Menu.Dropdown

	private readonly popularArr = ["No choice", "Minimum", "Medium", "Maximum"]

	constructor(node: Menu.Node) {
		this.PopularSettings = node.AddDropdown(
			"Popular settings",
			this.popularArr,
			0,
			"No choice - will not overwrite\nyour last settings after entering the game\nor reload scripts"
		)

		this.ModeImages = node.AddDropdown("Images", ["Circles", "Squares"])
		this.LevelState = node.AddToggle(
			"Level",
			true,
			"Show abilities level",
			-1,
			ImageData.Icons.icon_svg_level
		)
		this.ChargeState = node.AddToggle(
			"Charge",
			true,
			"Show abilities charge",
			-1,
			ImageData.Icons.icon_svg_charges
		)

		this.DurationState = node.AddToggle(
			"Duration",
			true,
			"Show abilities end duration",
			-1,
			ImageData.Icons.icon_svg_duration
		)

		this.FowTime = node.AddToggle(
			"Fog time",
			false,
			"Show time in fog of war",
			-1,
			ImageData.Icons.icon_svg_fow_time
		)

		this.FormatTime = node.AddToggle(
			"Format time",
			false,
			"Show cooldown\nformat time (min:sec)",
			-1,
			ImageData.Icons.icon_svg_format_time
		)
	}
}

export class MenuManager {
	public readonly State: Menu.Toggle
	public readonly BarsMenu: BarsMenu
	public readonly ItemMenu: ItemsMenu
	public readonly RunesMenu: RunesMenu
	public readonly SpellMenu: SpellMenu
	public readonly LastHitMenu: LastHitMenu
	public readonly MenuBuyBack: MenuBuyBack
	public readonly General: GeneralSettings

	private readonly tree: Menu.Node
	private readonly generalTree: Menu.Node
	private readonly iconSettings = ImageData.Icons.icon_settings

	private readonly teamArray = [
		"Disable",
		"Allies and enemy",
		"Only enemy",
		"Only allies"
	]

	constructor() {
		const entries = Menu.AddEntry("Visual")
		this.tree = entries.AddNode("Top panel", ImageData.Icons.icon_svg_hamburger)
		this.tree.SortNodes = false

		this.State = this.tree.AddToggle("State", true)
		this.generalTree = this.tree.AddNode("General settings", this.iconSettings)
		this.generalTree.SortNodes = false

		this.General = new GeneralSettings(this.generalTree)
		this.BarsMenu = new BarsMenu(this.tree, this.teamArray)
		this.RunesMenu = new RunesMenu(this.tree, this.teamArray)
		this.ItemMenu = new ItemsMenu(this.tree, this.teamArray)
		this.SpellMenu = new SpellMenu(this.tree, this.teamArray)

		this.MenuBuyBack = new MenuBuyBack(this.tree, this.teamArray)
		this.LastHitMenu = new LastHitMenu(this.tree, this.teamArray)
		this.General.PopularSettings.OnValue(call => this.PopularSettingsChanged(call))
	}

	protected PopularSettingsChanged(call: Menu.Dropdown) {
		this.BarsMenu.PopularSettingsChanged(call.SelectedID)
		this.ItemMenu.PopularSettingsChanged(call.SelectedID)
		this.SpellMenu.PopularSettingsChanged(call.SelectedID)
		this.RunesMenu.PopularSettingsChanged(call.SelectedID)
		this.LastHitMenu.PopularSettingsChanged(call.SelectedID)
		this.MenuBuyBack.PopularSettingsChanged(call.SelectedID)

		switch (call.SelectedID) {
			case EPopularSettings.Minimal:
				this.General.FowTime.value = false
				this.General.DurationState.value = false
				break
			case EPopularSettings.Moderate:
				this.General.FowTime.value = false
				this.General.DurationState.value = true
				break
			case EPopularSettings.Maximum:
				this.General.DurationState.value = true
				break
		}
	}
}
