import {
	Ability,
	DOTAGameState,
	GameRules,
	Item,
	PlayerCustomData
} from "github.com/octarine-public/wrapper/index"

import { GUIPlayer } from "./gui"
import { MenuManager } from "./menu"
import { SpellMenu } from "./menu/spells"

export class PlayerData {
	private readonly hpThreshold = 50
	private readonly items: Item[] = []
	private readonly spells: Ability[] = []

	protected readonly GUI: GUIPlayer

	constructor(private readonly player: PlayerCustomData) {
		this.GUI = new GUIPlayer(player)
		this.GUI.UpdateGUI()
	}

	public get Hero() {
		return this.player.Hero
	}

	protected get IsPreGame() {
		return (
			GameRules === undefined ||
			GameRules.GameState === DOTAGameState.DOTA_GAMERULES_STATE_PRE_GAME
		)
	}

	public Draw(menu: MenuManager) {
		const hero = this.player.Hero
		const isRoles = this.player.LaneSelections.length !== 0
		const isHPThreshold = (hero?.HPPercent ?? 100) < this.hpThreshold
		const skipBottomData = this.IsPreGame && isRoles && !isHPThreshold

		this.GUI.UpdateGUI(skipBottomData)
		this.GUI.RenderRune(menu.RunesMenu)

		if (!this.GUI.CanRenderFowTime(menu)) {
			this.GUI.RenderLastHit(menu.LastHitMenu)
		}

		if (!skipBottomData) {
			this.GUI.RenderHealth(menu.BarsMenu)
			this.GUI.RenderMana(menu.BarsMenu)
			this.GUI.RenderBuyback(menu)

			this.GUI.RenderSpell(menu, this.items, this.spells)
			this.GUI.RenderMiniItems(menu, this.items)
		}

		this.GUI.RenderIconUltimate(menu, this.spells)
	}

	public UnitItemsChanged(newItems: Item[]) {
		const newItem = newItems.find(x => !this.items.includes(x))
		if (newItem !== undefined) {
			this.items.push(newItem)
		}
		for (let index = this.items.length - 1; index > -1; index--) {
			const item = this.items[index]
			if (!newItems.includes(item)) {
				this.items.remove(item)
			}
		}
	}

	public UnitAbilitiesChanged(menu: SpellMenu, newAbilities: Ability[]) {
		const newSpell = newAbilities.find(x => !this.spells.includes(x))
		if (newSpell !== undefined) {
			this.spells.push(newSpell)
			menu.AddSpell(this.player.Hero, newSpell)
		}
	}

	public EntityDestroyed(entity: Item | Ability) {
		switch (true) {
			case entity instanceof Item:
				this.items.remove(entity)
				break
			case entity instanceof Ability:
				this.spells.remove(entity)
				break
		}
	}
}
