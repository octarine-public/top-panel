import {
	Ability,
	DOTAGameState,
	GameRules,
	Item,
	PlayerCustomData
} from "github.com/octarine-public/wrapper/index"

import { GUIPlayer } from "./gui"
import { MenuManager } from "./menu"

export class PlayerData {
	protected readonly GUI: GUIPlayer
	private readonly hpThreshold = 50
	private items: Item[] = []
	private spells: Ability[] = []

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
		this.items = newItems
		this.items.orderBy(x => -x.ItemSlot)
	}

	public UnitAbilitiesChanged(newAbilities: Ability[]) {
		this.spells = newAbilities
		this.spells.orderBy(x => -x.AbilitySlot)
	}

	public EntityDestroyed(entity: Item | Ability) {
		switch (true) {
			case entity instanceof Item:
				this.items.remove(entity)
				this.items.orderBy(x => -x.ItemSlot)
				break
			case entity instanceof Ability:
				this.spells.remove(entity)
				this.spells.orderBy(x => -x.AbilitySlot)
				break
		}
	}
}
