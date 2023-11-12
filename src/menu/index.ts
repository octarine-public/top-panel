import { ImageData, Menu, Sleeper } from "github.com/octarine-public/wrapper/index"

import { EPopularSettings } from "../enums/EPopularSettings"
import { BarsMenu } from "./bars"
import { ItemsMenu } from "./items"
import { SpellMenu } from "./spells"

class GeneralSettings {
	public readonly FowTime: Menu.Toggle
	public readonly ModeImages: Menu.Dropdown
	public readonly LevelState: Menu.Toggle
	public readonly FormatTime: Menu.Toggle
	public readonly ChargeState: Menu.Toggle
	public readonly DurationState: Menu.Toggle
	public readonly PopularSettings: Menu.Dropdown

	private readonly iconLevel = "icons/menu/level.svg"
	private readonly iconFowTime = "icons/menu/fow_time.svg"
	private readonly iconCharges = "icons/menu/charges.svg"
	private readonly iconDuration = "icons/menu/duration.svg"
	private readonly iconFormatTime = "icons/menu/format_time.svg"

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
			this.iconLevel
		)
		this.ChargeState = node.AddToggle(
			"Charge",
			true,
			"Show abilities charge",
			-1,
			this.iconCharges
		)

		this.DurationState = node.AddToggle(
			"Duration",
			true,
			"Show abilities end duration",
			-1,
			this.iconDuration
		)

		this.FowTime = node.AddToggle(
			"Fog time",
			false,
			"Show time in fog of war",
			-1,
			this.iconFowTime
		)

		this.FormatTime = node.AddToggle(
			"Format time",
			false,
			"Show cooldown\nformat time (min:sec)",
			-1,
			this.iconFormatTime
		)
	}

	public ResetSettings() {
		this.ModeImages.SelectedID = 0
		this.FowTime.value = this.FormatTime.value = false
		this.LevelState.value = this.ChargeState.value = true
		this.ChargeState.value = this.DurationState.value = true
	}
}

export class MenuManager {
	public readonly State: Menu.Toggle
	public readonly BarsMenu: BarsMenu
	public readonly ItemMenu: ItemsMenu
	public readonly SpellMenu: SpellMenu
	public readonly General: GeneralSettings

	protected readonly GeneralTree: Menu.Node

	private readonly tree: Menu.Node
	private readonly sleeper = new Sleeper()
	private readonly iconHamburger =
		"github.com/octarine-public/top-panel/scripts_files/icons/menu/hamburger.svg"
	private readonly iconSettings = ImageData.Paths.Icons.icon_settings

	private readonly teamArray = [
		"Disable",
		"Allies and enemy",
		"Only enemy",
		"Only allies"
	]

	constructor() {
		const entries = Menu.AddEntry("Visual")
		this.tree = entries.AddNode("Top panel", this.iconHamburger)
		this.tree.SortNodes = false

		this.State = this.tree.AddToggle("State", true)
		this.GeneralTree = this.tree.AddNode("General settings", this.iconSettings)
		this.GeneralTree.SortNodes = false

		this.General = new GeneralSettings(this.GeneralTree)
		this.SpellMenu = new SpellMenu(this.tree, this.teamArray)
		this.ItemMenu = new ItemsMenu(this.tree, this.teamArray)
		this.BarsMenu = new BarsMenu(this.tree, this.teamArray)

		this.General.PopularSettings.OnValue(call => this.PopularSettingsChanged(call))
	}

	public GameChanged(_ended?: boolean): void {
		this.sleeper.FullReset()
	}

	protected OnResetSettings() {
		this.State.value = true
		this.General.ResetSettings()
		this.BarsMenu.ResetSettings()
		this.ItemMenu.ResetSettings()
	}

	protected PopularSettingsChanged(call: Menu.Dropdown) {
		this.BarsMenu.PopularSettingsChanged(call.SelectedID)
		this.ItemMenu.PopularSettingsChanged(call.SelectedID)
		this.SpellMenu.PopularSettingsChanged(call.SelectedID)
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
