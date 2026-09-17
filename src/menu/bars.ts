import { EPopularSettings } from "../enums/EPopularSettings"
import { ETeamState } from "../enums/ETeamState"
import { TopPanelIcons } from "./icons"
import { CreateTeamSelect, SetTeams } from "./team"

export class BarsMenu {
	public readonly TeamMana: Menu.MultiSelect
	public readonly TeamHealth: Menu.MultiSelect

	public readonly Tree: Menu.Node

	constructor(menu: Menu.Node) {
		this.Tree = menu.AddNode(
			"Bars",
			TopPanelIcons.Bars,
			"Health and mana bars\nunder the hero portraits"
		)
		this.Tree.SortNodes = false

		this.TeamHealth = CreateTeamSelect(this.Tree, "Health", TopPanelIcons.Health)
		this.TeamMana = CreateTeamSelect(this.Tree, "Mana", TopPanelIcons.Mana)
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		switch (type) {
			case EPopularSettings.Minimal:
				SetTeams(this.TeamMana)
				SetTeams(this.TeamHealth)
				break
			case EPopularSettings.Moderate:
				SetTeams(this.TeamMana, ETeamState.Enemies)
				SetTeams(this.TeamHealth, ETeamState.Enemies)
				break
			case EPopularSettings.Maximum:
				SetTeams(this.TeamMana, ETeamState.Enemies, ETeamState.Allies)
				SetTeams(this.TeamHealth, ETeamState.Enemies, ETeamState.Allies)
				break
		}
	}
}
