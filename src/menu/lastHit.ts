import { EPopularSettings } from "../enums/EPopularSettings"
import { ETeamState } from "../enums/ETeamState"
import { TopPanelIcons } from "./icons"
import { LastHitTextStyle, TextStyle, TextStyleMenu } from "./style"
import { CreateTeamSelect, SetTeams } from "./team"

export class LastHitMenu {
	public readonly Team: Menu.MultiSelect
	public readonly Style: TextStyleMenu

	private readonly Tree: Menu.Node

	constructor(menu: Menu.Node) {
		this.Tree = menu.AddNode(
			"Last hits",
			TopPanelIcons.LastHits,
			"Counts of killed\nor deny creeps"
		)
		this.Tree.SortNodes = false
		this.Team = CreateTeamSelect(this.Tree)
		// The counter and its replacement fog timer use the game's font until overridden.
		this.Style = new TextStyleMenu(this.Tree, LastHitTextStyle)
	}

	/** The type the counter and the fog timer are set in. */
	public get TextStyle(): TextStyle {
		return this.Style.Effective
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
