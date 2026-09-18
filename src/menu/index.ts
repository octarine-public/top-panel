import { EModeImages } from "../enums/EModeImages"
import { EPopularSettings } from "../enums/EPopularSettings"
import { BarsMenu } from "./bars"
import { MenuBuyBack } from "./buyBack"
import { TopPanelIcons } from "./icons"
import { ItemsMenu } from "./items"
import { LastHitMenu } from "./lastHit"
import { RunesMenu } from "./runes"
import { SpellMenu } from "./spells"
import { BaseTextStyle, TextStyle } from "./style"

type ConfigObject = MenuSDK.ConfigObject

/** The corner a square icon is cut at unless the user moves it: a fifth of its side. */
const DEFAULT_ROUNDING = 20
/** The furthest the corner goes, where the four arcs meet and the square is a circle. */
const MAX_ROUNDING = 50

class GeneralSettings {
	public readonly FowTime: Menu.Toggle
	public readonly ModeImages: Menu.Dropdown
	/** The corner of a square icon as a share of its side; hidden while the icons are circles. */
	public readonly Rounding: Menu.Slider
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
		this.PopularSettings.IconPath = TopPanelIcons.Popular

		this.ModeImages = node.AddDropdown(
			"Images",
			["Circles", "Squares"],
			0,
			"Shape of ability and item icons"
		)
		this.ModeImages.IconPath = TopPanelIcons.Shape

		this.Rounding = node.AddSlider(
			"Rounding",
			DEFAULT_ROUNDING,
			0,
			MAX_ROUNDING,
			0,
			"Corner radius of square icons\nas a share of their side"
		)
		this.Rounding.Suffix = "%"
		this.Rounding.IconPath = TopPanelIcons.Rounding

		this.LevelState = node.AddToggle("Level", false, "Show abilities level")
		this.LevelState.IconPath = TopPanelIcons.Level

		this.ChargeState = node.AddToggle("Charge", false, "Show abilities charge")
		this.ChargeState.IconPath = TopPanelIcons.Charge

		this.DurationState = node.AddToggle(
			"Duration",
			true,
			"Show abilities end duration"
		)
		this.DurationState.IconPath = TopPanelIcons.Duration

		this.FowTime = node.AddToggle("Fog time", false, "Show time in fog of war")
		this.FowTime.IconPath = TopPanelIcons.FogTime

		this.FormatTime = node.AddToggle(
			"Format time",
			false,
			"Show cooldown\nformat time (min:sec)"
		)
		this.FormatTime.IconPath = TopPanelIcons.FormatTime

		// a circle has no corner to set, so the rounding row stands only under squares
		const sync = () => {
			this.Rounding.IsHidden = this.IsCircle
			node.Update()
		}
		this.ModeImages.OnValue(sync)
		sync()
	}

	/** Whether the ability and item icons are cut round rather than square. */
	public get IsCircle(): boolean {
		return this.ModeImages.SelectedID === EModeImages.Circles
	}

	/**
	 * The corner radius of an icon `side` px across: half the side for a circle, the rounding
	 * slider's share of it for a square.
	 */
	public IconRadius(side: number): number {
		return Math.round(side * (this.IsCircle ? 0.5 : this.Rounding.value / 100))
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
	/** The type every label is set in unless a page overrides it. */
	public readonly Style: TextStyle = BaseTextStyle

	private readonly tree: Menu.Node

	constructor() {
		const entries = Menu.AddEntry("Visual")
		this.tree = entries.AddNode(
			"Top panel",
			TopPanelIcons.TopPanel,
			"Health, mana, cooldowns, runes and items\nover the hero portraits at the top of the screen"
		)
		// the page lays its child pages out as tabs, in the order they are added
		this.tree.SortNodes = false
		this.tree.TabbedChildren = true
		// a config written before the tabs keeps its values: the flat pages fold into them
		MenuSDK.AddConfigMigration(raw =>
			migrateTopPanel(MenuSDK.ConfigSubtreeOf(raw, this.tree.entry))
		)
		migrateTopPanel(this.tree.entry.stored)

		const general = this.tree.AddNode("General", TopPanelIcons.General)
		general.SortNodes = false
		// the script's own switch rides the top bar beside the breadcrumb and gates every tab
		this.State = general.AddToggle("State", true)
		general.HeaderControl = this.State
		this.tree.HeaderControl = this.State
		this.tree.Gate = this.State
		this.General = new GeneralSettings(general)

		this.BarsMenu = new BarsMenu(this.tree)
		this.SpellMenu = new SpellMenu(this.tree)
		this.ItemMenu = new ItemsMenu(this.tree)

		// the one-row pages share a tab, each a section of its own
		const other = this.tree.AddNode("Other", TopPanelIcons.Other)
		other.SortNodes = false
		this.RunesMenu = new RunesMenu(other)
		this.MenuBuyBack = new MenuBuyBack(other)
		this.LastHitMenu = new LastHitMenu(other)

		// the tabs stand in this order, whatever order the pages were built in
		const tabs = [
			general,
			this.BarsMenu.Tree,
			this.SpellMenu.Tree,
			this.ItemMenu.Tree,
			other
		]
		tabs.forEach((tab, index) => (tab.Priority = index))

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

/**
 * Reshapes the rows of the top panel saved before its pages became tabs: the "State" switch and
 * the "General settings" page fold into the General tab, and the pages of one row each gather
 * under the Other tab. The team rows saved as a dropdown of every side combination become the
 * ticks of the multiselect that replaced it, and the page-wide "Style" tab goes out with the rows
 * it stood for. Idempotent, as a migration must be — a config already saved in the new shape
 * passes through untouched.
 */
function migrateTopPanel(stored: Nullable<ConfigObject>): void {
	if (stored === undefined) {
		return
	}
	const generalSettings = objectOf(stored["General settings"])
	delete stored["General settings"]
	// the page-wide style is the panel's own now, with no rows left to save
	delete stored.Style
	moveRows(stored, "General", ["State"], generalSettings)
	moveRows(stored, "Other", ["Runes", "BuyBack", "Last hits"])
	for (const [page, rows] of TeamRows) {
		const subtree = page.reduce<Nullable<ConfigObject>>(
			(node, name) => (node === undefined ? undefined : objectOf(node[name])),
			stored
		)
		if (subtree === undefined) {
			continue
		}
		for (const row of rows) {
			migrateTeamRow(subtree, row)
		}
	}
}

/** The pages of the top panel that carry a team row, and the rows each of them carries. */
const TeamRows: [readonly string[], readonly string[]][] = [
	[["Bars"], ["Health", "Mana"]],
	[["Abilities"], ["Team"]],
	[["Items"], ["Team"]],
	[["Other", "Runes"], ["Team"]],
	[["Other", "BuyBack"], ["Team"]],
	[["Other", "Last hits"], ["Team"]]
]

/** The options of the old team dropdown, in the order it listed them. */
const TeamOptions = ["Disable", "Allies and enemy", "Only enemy", "Only allies"]

/** The sides each of those options stood for, under the same index. */
const TeamsOfOption: readonly string[][] = [
	[],
	["Enemies", "Allies"],
	["Enemies"],
	["Allies"]
]

/** The ticks a multiselect stores for the option the old dropdown was left on. */
function teamTicks(option: number): [string, boolean][] {
	const selected = TeamsOfOption[option]
	return [
		["Enemies", selected.includes("Enemies")],
		["Allies", selected.includes("Allies")]
	]
}

/**
 * Turns one team row saved as a dropdown index into the ticks of the multiselect now in its
 * place, hotkeys and logic rules included — each of those held the name of an option and now
 * holds the sides it stood for. A row already saved as ticks is left as it is, and so is one
 * saved on an index the dropdown never had: the row falls back to its own default.
 */
function migrateTeamRow(page: ConfigObject, row: string): void {
	const holder = objectOf(page[row])
	const value = holder === undefined ? page[row] : holder.v
	if (typeof value !== "number" || TeamsOfOption[value] === undefined) {
		return
	}
	if (holder === undefined) {
		page[row] = teamTicks(value)
		return
	}
	holder.v = teamTicks(value)
	for (const key of ["hotkeys", "logic"]) {
		const drivers = holder[key]
		if (!Array.isArray(drivers)) {
			continue
		}
		for (const driver of drivers) {
			const record = objectOf(driver)
			const option = record?.value
			if (record !== undefined && typeof option === "string") {
				record.value = [...(TeamsOfOption[TeamOptions.indexOf(option)] ?? [])]
			}
		}
	}
}

/**
 * Carries the rows named into the page `into`, along with the `extra` rows of a page that folded
 * into it. A row the page already holds keeps its value, and the old keys are gone either way.
 */
function moveRows(
	stored: ConfigObject,
	into: string,
	names: readonly string[],
	extra?: ConfigObject
): void {
	const moved: ConfigObject = { ...extra }
	for (const name of names) {
		if (stored[name] !== undefined) {
			moved[name] = stored[name]
			delete stored[name]
		}
	}
	if (Object.keys(moved).length === 0) {
		return
	}
	const page = objectOf(stored[into]) ?? {}
	for (const [name, value] of Object.entries(moved)) {
		page[name] ??= value
	}
	stored[into] = page
}

/** The rows a config keeps under a page, or nothing when the value is not a page at all. */
function objectOf(value: unknown): Nullable<ConfigObject> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as ConfigObject)
		: undefined
}
