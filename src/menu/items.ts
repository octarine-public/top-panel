import { Menu } from "github.com/octarine-public/wrapper/index"

import { EPopularSettings } from "../enums/EPopularSettings"
import { Icon } from "../Icon"

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

	public readonly Team: Menu.Dropdown
	public readonly Items: Menu.ImageSelector

	private readonly tree: Menu.Node

	constructor(menu: Menu.Node, team: string[]) {
		this.tree = menu.AddNode("Items", Icon.ItemNode)
		this.tree.SortNodes = false

		this.Team = this.tree.AddDropdown("Team", team, 1)
		this.Items = this.tree.AddImageSelector(
			"Items",
			this.allowItems,
			new Map(this.allowItems.map(name => [name, true]))
		)
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		const defaultEnabled = [
			"item_tpscroll",
			"item_travel_boots",
			"item_travel_boots_2"
		]

		switch (type) {
			case EPopularSettings.Minimal:
				this.Team.SelectedID = 2
				this.SetItems(
					"item_gem",
					"item_dust",
					"item_smoke_of_deceit",
					...defaultEnabled
				)
				break
			case EPopularSettings.Moderate:
				this.Team.SelectedID = 1
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
				this.Team.SelectedID = 1
				this.SetItems(...this.allowItems)
				break
		}
	}

	public ResetSettings() {
		this.Team.SelectedID = 1
		this.SetItems(...this.allowItems)
	}

	protected SetItems(...nameEnabled: string[]) {
		for (const [name] of this.Items.enabledValues) {
			this.Items.enabledValues.set(name, nameEnabled.includes(name))
		}
	}
}
