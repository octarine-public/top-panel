import { EPopularSettings } from "../enums/EPopularSettings"
import { ETeamState } from "../enums/ETeamState"
import { TopPanelIcons } from "./icons"
import { CreateTeamSelect, SetTeams } from "./team"

export class ItemsMenu {
	public readonly allowItems = [
		"item_gem",
		"item_dust",
		"item_rapier",
		"item_aegis",
		"item_cheese",
		"item_sphere",
		"item_aeon_disk",
		"item_refresher_shard",
		"item_smoke_of_deceit",
		"item_ward_sentry",
		"item_ward_observer",
		"item_ward_dispenser",
		"item_tpscroll",
		"item_travel_boots",
		"item_travel_boots_2"
	]

	public readonly Team: Menu.MultiSelect
	public readonly Items: Menu.ImageSelector

	public readonly Tree: Menu.Node

	constructor(menu: Menu.Node) {
		this.Tree = menu.AddNode(
			"Items",
			TopPanelIcons.Items,
			"Important items over the portrait:\nwards, TP, gem, dust, aegis and more"
		)
		this.Tree.SortNodes = false

		this.Team = CreateTeamSelect(this.Tree)
		this.Items = this.Tree.AddImageSelector(
			"Items",
			this.allowItems,
			new Map(this.allowItems.map(name => [name, true]))
		)
		this.Items.IconPath = TopPanelIcons.ItemList
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		const defaultEnabled = [
			"item_tpscroll",
			"item_travel_boots",
			"item_travel_boots_2"
		]

		switch (type) {
			case EPopularSettings.Minimal:
				SetTeams(this.Team, ETeamState.Enemies)
				this.SetItems(
					"item_gem",
					"item_dust",
					"item_smoke_of_deceit",
					...defaultEnabled
				)
				break
			case EPopularSettings.Moderate:
				SetTeams(this.Team, ETeamState.Enemies, ETeamState.Allies)
				this.SetItems(
					"item_gem",
					"item_rapier",
					"item_dust",
					"item_aegis",
					"item_cheese",
					"item_sphere",
					"item_smoke_of_deceit",
					...defaultEnabled
				)
				break
			case EPopularSettings.Maximum:
				SetTeams(this.Team, ETeamState.Enemies, ETeamState.Allies)
				this.SetItems(...this.allowItems)
				break
		}
	}

	protected SetItems(...nameEnabled: string[]) {
		for (const [name] of this.Items.enabledValues) {
			this.Items.enabledValues.set(name, nameEnabled.includes(name))
		}
	}
}
