import { Ability, Item, Player } from "github.com/octarine-public/wrapper/index"

export class PlayerModel {
	private readonly items = new Set<Item>()
	private readonly spells = new Set<Ability>()

	constructor(public readonly Owner: Player) {}

	public UnitItemsChanged(newItems: Item[]) {
		for (const newItem of newItems) {
			if (!this.items.has(newItem)) {
				this.items.add(newItem)
			}
		}
	}

	public UnitAbilitiesChanged(newAbilities: Ability[]) {
		for (const newItem of newAbilities) {
			if (!this.spells.has(newItem)) {
				this.spells.add(newItem)
			}
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
