import {
	Ability,
	DOTAGameState,
	GameRules,
	Item,
	Player
} from "github.com/octarine-public/wrapper/index"

import { GUIPlayer } from "./gui"
import { MenuManager } from "./menu"
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

	protected get IsPreGame() {
		return (
			GameRules === undefined ||
			GameRules.GameState === DOTAGameState.DOTA_GAMERULES_STATE_PRE_GAME
		)
	}

	public Draw(menu: MenuManager) {
		const hasRoles = this.player.LaneSelections.length !== 0
		const skipBottomData = this.IsPreGame && hasRoles

		this.GUI.UpdateGUI(skipBottomData)
		this.GUI.RenderRune(menu.RunesMenu)

		// if (!this.GUI.IsDrawFowTime(menu)) {
		// 	this.GUI.DrawLastHit(menu.LastHitMenu)
		// }

		if (!skipBottomData) {
			this.GUI.RenderHealth(menu.BarsMenu)
			this.GUI.RenderMana(menu.BarsMenu)
			// this.GUI.RenderBuyback(menu)

			// this.GUI.RenderSpell(menu, this.items, this.spells)
			// this.GUI.RenderMiniItems(menu, this.items)
		}

		this.GUI.RenderIconUltimate(menu, this.spells)
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

	public WindowSizeChanged() {
		this.GUI.UpdateGUI()
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
