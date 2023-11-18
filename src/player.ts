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
	private readonly items = new Set<Item>()
	private readonly spells = new Set<Ability>()

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
		const newItem = newItems.find(x => !this.items.has(x))
		if (newItem !== undefined) {
			this.items.add(newItem)
		}
		for (const item of this.items) {
			if (!newItems.includes(item)) {
				this.items.delete(item)
			}
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
