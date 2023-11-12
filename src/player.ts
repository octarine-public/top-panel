import { Ability, Item, Player } from "github.com/octarine-public/wrapper/index"

import { GUIPlayer } from "./gui"

export class PlayerModel {
	private readonly items = new Set<Item>()
	private readonly spells = new Set<Ability>()

	protected readonly GUI: GUIPlayer

	constructor(player: Player) {
		this.GUI = new GUIPlayer(player)
		this.GUI.UpdateGUI()
	}

	public UnitItemsChanged(newItems: Item[]) {
		const newItem = newItems.find(x => !this.items.has(x))
		if (newItem !== undefined) {
			this.items.add(newItem)
		}
	}

	public UnitAbilitiesChanged(newAbilities: Ability[]) {
		const newSpell = newAbilities.find(x => !this.spells.has(x))
		if (newSpell !== undefined) {
			this.spells.add(newSpell)
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
