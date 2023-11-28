import { ImageData, Menu } from "github.com/octarine-public/wrapper/index"

import { EPopularSettings } from "../enums/EPopularSettings"

export class RunesMenu {
	public readonly Team: Menu.Dropdown
	private readonly Tree: Menu.Node

	constructor(menu: Menu.Node, team: string[]) {
		this.Tree = menu.AddNode("Runes", ImageData.GetRuneTexture("regen"), "", 0)
		this.Tree.SortNodes = false
		this.Team = this.Tree.AddDropdown("Team", team, 1)
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		switch (type) {
			case EPopularSettings.Minimal:
				this.Team.SelectedID = 0
				break
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
