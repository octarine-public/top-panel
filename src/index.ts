import "./translations"

import {
	Ability,
	DOTA_ABILITY_BEHAVIOR,
	DOTAGameState,
	DOTAGameUIState,
	DOTAScriptInventorySlot,
	Entity,
	EventsSDK,
	GameRules,
	GameState,
	Hero,
	Item,
	PlayerCustomData,
	SpiritBear,
	Unit
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu/index"
import { PlayerData } from "./player"

new (class CTopPanelESP {
	private readonly menu = new MenuManager()
	private readonly players = new Map<number, PlayerData>()
	private readonly allowMaps = [
		"dota",
		"map_dota",
		"hero_demo_main",
		"hero_demo_frostivus"
	]

	constructor() {
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
		EventsSDK.on("EntityDestroyed", this.EntityDestroyed.bind(this))
		EventsSDK.on("UnitItemsChanged", this.UnitItemsChanged.bind(this))
		EventsSDK.on("UnitAbilitiesChanged", this.UnitAbilitiesChanged.bind(this))
		EventsSDK.on("PlayerCustomDataUpdated", this.PlayerCustomDataUpdated.bind(this))
	}

	protected get State() {
		return this.menu.State.value
	}

	protected get IsDisabledMap() {
		return !this.allowMaps.includes(GameState.MapName)
	}

	protected get IsPostGame() {
		return (
			GameRules === undefined ||
			GameRules.GameState === DOTAGameState.DOTA_GAMERULES_STATE_POST_GAME
		)
	}

	private get canDraw() {
		if (this.IsPostGame || !this.menu.State.value) {
			return false
		}
		if (this.IsDisabledMap) {
			return false
		}
		return GameState.UIState === DOTAGameUIState.DOTA_GAME_UI_DOTA_INGAME
	}

	public Draw() {
		if (this.canDraw) {
			this.players.forEach(player => player.Draw(this.menu))
		}
	}

	public EntityCreated(entity: Entity) {
		if (this.IsDisabledMap) {
			return
		}
		if (!(entity instanceof Hero) || !entity.IsRealHero) {
			return
		}
		const playerData = this.getPlayerData(entity)
		if (playerData !== undefined) {
			this.menu.SpellMenu.AddHero(entity)
		}
	}

	public PlayerCustomDataUpdated(player: PlayerCustomData) {
		if (!this.IsDisabledMap) {
			this.playerChanged(player)
		}
	}

	public EntityDestroyed(entity: Entity) {
		if (this.IsDisabledMap) {
			return
		}
		if (entity instanceof Hero && entity.IsRealHero) {
			this.menu.SpellMenu.DestroyHero(entity)
		}
		if (!(entity instanceof Item || entity instanceof Ability)) {
			return
		}
		let owner = entity.Owner
		if (owner === undefined) {
			return
		}
		if (!(owner instanceof Hero || owner instanceof SpiritBear)) {
			owner = owner.Owner as Nullable<Unit>
		}
		if (
			!(owner instanceof Hero || owner instanceof SpiritBear) ||
			(entity instanceof Hero && !entity.IsRealHero)
		) {
			return
		}
		this.getPlayerData(owner)?.EntityDestroyed(entity)
	}

	public UnitAbilitiesChanged(entity: Unit) {
		if (this.IsDisabledMap) {
			return
		}
		if (!(entity instanceof Hero || entity instanceof SpiritBear)) {
			return
		}
		if (entity instanceof Hero && !entity.IsRealHero) {
			return
		}
		const playerData = this.getPlayerData(entity)
		if (playerData === undefined || playerData.Hero === undefined) {
			return
		}
		const abiliies = entity.Spells.filter(abil =>
			this.shouldBeValid(abil)
		) as Ability[]
		playerData.UnitAbilitiesChanged(abiliies)
		this.menu.SpellMenu.AddSpell(playerData.Hero, abiliies)
	}

	public UnitItemsChanged(entity: Unit) {
		if (this.IsDisabledMap) {
			return
		}
		if (!(entity instanceof Hero || entity instanceof SpiritBear)) {
			return
		}
		if (entity instanceof Hero && !entity.IsRealHero) {
			return
		}
		const playerData = this.getPlayerData(entity)
		if (playerData === undefined) {
			return
		}
		const items = !entity.IsHero
			? this.getItems(entity)
			: this.getItems(playerData.Hero)
		playerData.UnitItemsChanged(items.filter(abil => this.shouldBeValid(abil)))
	}

	private getPlayerData(entity: Hero | SpiritBear) {
		let playerID = entity.PlayerID
		if (playerID === -1) {
			playerID = entity.OwnerPlayerID // example: courier
		}
		return this.players.get(playerID)
	}

	private excludeSpells(abil: Ability) {
		return (
			abil.IsPassive ||
			!abil.ShouldBeDrawable ||
			abil.Name.endsWith("_release") ||
			this.menu.SpellMenu.ExludedSpells.includes(abil.Name)
		)
	}

	private includesItems(abil: Ability) {
		return this.menu.ItemMenu.allowItems.includes(abil.Name)
	}

	private shouldBeValid(abil: Nullable<Ability>) {
		if (abil === undefined) {
			return false
		}

		const isItem = abil.IsItem
		const isUltimate = abil.IsUltimate

		if (
			(isItem && !this.includesItems(abil)) ||
			(!isItem && this.excludeSpells(abil))
		) {
			return false
		}

		if (
			!isItem &&
			!isUltimate &&
			abil.HasBehavior(DOTA_ABILITY_BEHAVIOR.DOTA_ABILITY_BEHAVIOR_TOGGLE)
		) {
			return false
		}

		if ((isUltimate || isItem) && abil.IsPassive) {
			return true
		}

		return true
	}

	private getItems(unit: Nullable<Unit>) {
		if (unit === undefined) {
			return []
		}
		const inventory = unit.Inventory
		return inventory
			.GetItems(
				DOTAScriptInventorySlot.DOTA_ITEM_SLOT_1,
				DOTAScriptInventorySlot.DOTA_ITEM_SLOT_9
			)
			.concat(
				inventory.GetItems(
					DOTAScriptInventorySlot.DOTA_ITEM_TP_SCROLL,
					DOTAScriptInventorySlot.DOTA_ITEM_NEUTRAL_SLOT
				)
			)
	}

	private playerChanged(entity: PlayerCustomData) {
		if (!entity.IsValid || entity.IsSpectator) {
			this.players.delete(entity.PlayerID)
			return
		}
		const playerData = this.players.get(entity.PlayerID)
		if (playerData !== undefined) {
			this.updatePlayerDataItemSpell(playerData)
			return
		}
		const newPlayerData = new PlayerData(entity)
		this.updatePlayerDataItemSpell(newPlayerData)
		this.players.set(entity.PlayerID, newPlayerData)
	}

	private updatePlayerDataItemSpell(playerData: PlayerData) {
		const hero = playerData.Hero
		if (hero === undefined) {
			return
		}
		playerData.UnitItemsChanged(
			this.getItems(hero).filter(abil => this.shouldBeValid(abil))
		)
		playerData.UnitAbilitiesChanged(
			hero.Spells.filter(abil => this.shouldBeValid(abil)) as Ability[]
		)
	}
})()
