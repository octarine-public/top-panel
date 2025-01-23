import { ImageData, Menu } from "github.com/octarine-public/wrapper/index"

import { EPopularSettings } from "../enums/EPopularSettings"

export class BarsMenu {
	public readonly TeamMana: Menu.Dropdown
	public readonly TeamHealth: Menu.Dropdown

	private readonly tree: Menu.Node

	constructor(menu: Menu.Node, team: string[]) {
		this.tree = menu.AddNode("Bars", ImageData.Icons.icon_svg_health, "")
		this.tree.SortNodes = false

		this.TeamMana = this.tree.AddDropdown("Mana", team, 1)
		this.TeamHealth = this.tree.AddDropdown("Health", team, 1)
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		switch (type) {
			case EPopularSettings.Minimal:
				this.TeamMana.SelectedID = 0
				this.TeamHealth.SelectedID = 0
				break
			case EPopularSettings.Moderate:
				this.TeamMana.SelectedID = 2
				this.TeamHealth.SelectedID = 2
				break
			case EPopularSettings.Maximum:
				this.TeamMana.SelectedID = 1
				this.TeamHealth.SelectedID = 1
				break
		}
	}
}
