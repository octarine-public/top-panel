import { Ability, Item, Player } from "github.com/octarine-public/wrapper/index"

import { GUIPlayer } from "./gui"
import { ItemsMenu } from "./menu/items"
import { SpellMenu } from "./menu/spells"

export class PlayerModel {
	private readonly items = new Set<Item>()
	private readonly spells = new Set<Ability>()

	protected readonly GUI: GUIPlayer

	constructor(private readonly player: Player) {
		this.GUI = new GUIPlayer(player)
		this.GUI.UpdateGUI()
	}

	public UnitItemsChanged(_menu: ItemsMenu, newItems: Item[]) {
		const newItem = newItems.find(x => !this.items.has(x))
		if (newItem !== undefined) {
			this.items.add(newItem)
		}
	}

	public UnitAbilitiesChanged(menu: SpellMenu, newAbilities: Ability[]) {
		const newSpell = newAbilities.find(x => !this.spells.has(x))
		if (newSpell !== undefined) {
			this.spells.add(newSpell)
			menu.AddSpell(this.player.Hero, newSpell)
		}
	}

	public EntityDestroyed(entity: Item | Ability) {
		switch (true) {
			case entity instanceof Item:
				this.items.delete(entity)
				break
			case entity instanceof Ability:
				this.spells.delete(entity)
				break
		}
	}
}
