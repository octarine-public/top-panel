import { EPopularSettings } from "../enums/EPopularSettings"
import { ETeamState } from "../enums/ETeamState"
import { TopPanelIcons } from "./icons"
import { CreateTeamSelect, SetTeams } from "./team"

export class RunesMenu {
	public readonly Team: Menu.MultiSelect
	private readonly Tree: Menu.Node

	constructor(menu: Menu.Node) {
		this.Tree = menu.AddNode(
			"Runes",
			TopPanelIcons.Runes,
			"Active rune over the portrait"
		)
		this.Tree.SortNodes = false
		this.Team = CreateTeamSelect(this.Tree)
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		switch (type) {
			case EPopularSettings.Minimal:
				SetTeams(this.Team)
				break
			case EPopularSettings.Moderate:
				SetTeams(this.Team, ETeamState.Enemies)
				break
			case EPopularSettings.Maximum:
				SetTeams(this.Team, ETeamState.Enemies, ETeamState.Allies)
				break
		}
	}
}
