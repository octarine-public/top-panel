import { ItemsMenu } from "./items"
import { SpellMenu } from "./spells"

export class MenuManager {
	public readonly ItemMenu: ItemsMenu
	public readonly SpellMenu: SpellMenu

	constructor() {
		this.ItemMenu = new ItemsMenu()
		this.SpellMenu = new SpellMenu()
	}
}
