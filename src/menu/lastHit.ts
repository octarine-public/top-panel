import { EPopularSettings } from "../enums/EPopularSettings"
import { ETeamState } from "../enums/ETeamState"
import { TopPanelIcons } from "./icons"
import { LastHitTextStyle, TextStyle, TextStyleMenu } from "./style"
import { CreateTeamSelect, SetTeams } from "./team"

/** What the plate under the counter is filled with while it is off. */
const NO_BACKGROUND = "#00000000"

export class LastHitMenu {
	public readonly Team: Menu.MultiSelect
	public readonly BackgroundState: Menu.Toggle
	public readonly Style: TextStyleMenu

	private readonly Tree: Menu.Node
	private readonly backgroundColor: Menu.ColorPicker
	private background = NO_BACKGROUND

	constructor(menu: Menu.Node) {
		this.Tree = menu.AddNode(
			"Last hits",
			TopPanelIcons.LastHits,
			"Counts of killed\nor deny creeps"
		)
		this.Tree.SortNodes = false
		this.Team = CreateTeamSelect(this.Tree)
		// a new key, so the plate the counter carried on by default before stays off
		this.BackgroundState = this.Tree.AddToggle(
			"background_v1",
			false,
			"Dark plate under the counter"
		)
		this.BackgroundState.IconPath = TopPanelIcons.Background
		this.backgroundColor = this.Tree.AddColorPicker(
			"Background color",
			new Color(0, 0, 0, 200)
		).SolidOnly()
		this.BackgroundState.PairColors(this.backgroundColor)
		// The counter and its replacement fog timer use the game's font until overridden.
		this.Style = new TextStyleMenu(this.Tree, LastHitTextStyle)

		const sync = () => {
			const color = this.backgroundColor.SelectedColor
			this.background = this.BackgroundState.value
				? MenuSDK.CssColor(color, color.a)
				: NO_BACKGROUND
		}
		this.BackgroundState.OnValue(sync)
		this.backgroundColor.OnValue(sync)
		sync()
	}

	/** The type the counter and the fog timer are set in. */
	public get TextStyle(): TextStyle {
		return this.Style.Effective
	}

	/** The plate under the counter and the fog timer, transparent while it is off. */
	public get Background(): string {
		return this.background
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		switch (type) {
			case EPopularSettings.Minimal:
				SetTeams(this.Team, ETeamState.Enemies)
				break
			case EPopularSettings.Moderate:
			case EPopularSettings.Maximum:
				SetTeams(this.Team, ETeamState.Enemies, ETeamState.Allies)
				break
		}
	}
}
