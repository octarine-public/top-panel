import { ImageData, Menu } from "github.com/octarine-public/wrapper/index"

import { EPopularSettings } from "../enums/EPopularSettings"

export class MenuBuyBack {
	public readonly Team: Menu.Dropdown
	private readonly Tree: Menu.Node

	constructor(menu: Menu.Node, team: string[]) {
		const imageNode = ImageData.Paths.Icons.gold_large
		this.Tree = menu.AddNode("BuyBack", imageNode, "", 0)
		this.Tree.SortNodes = false
		this.Team = this.Tree.AddDropdown("Team", team, 1)
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		switch (type) {
			case EPopularSettings.Minimal:
			case EPopularSettings.Moderate:
				this.Team.SelectedID = 2
				break
			case EPopularSettings.Maximum:
				this.Team.SelectedID = 1
				break
		}
	}

	public ResetSettings() {
		this.Team.SelectedID = 1
	}
}
