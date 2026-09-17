import { EPopularSettings } from "../enums/EPopularSettings"
import { ETeamState } from "../enums/ETeamState"
import { TopPanelIcons } from "./icons"
import { CreateTeamSelect, SetTeams } from "./team"

export class MenuBuyBack {
	public readonly Team: Menu.MultiSelect
	private readonly Tree: Menu.Node

	constructor(menu: Menu.Node) {
		this.Tree = menu.AddNode(
			"BuyBack",
			TopPanelIcons.BuyBack,
			"Buyback cooldown and availability"
		)
		this.Tree.SortNodes = false
		this.Team = CreateTeamSelect(this.Tree)
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		switch (type) {
			case EPopularSettings.Minimal:
			case EPopularSettings.Moderate:
				SetTeams(this.Team, ETeamState.Enemies)
				break
			case EPopularSettings.Maximum:
				SetTeams(this.Team, ETeamState.Enemies, ETeamState.Allies)
				break
		}
	}
}
