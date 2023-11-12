import "./translations"

import {
	Ability,
	Entity,
	EventsSDK,
	Hero,
	Item,
	Player,
	SpiritBear,
	Unit
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu/index"
import { PlayerModel } from "./player"

export const bootstrap = new (class CBootstrap {
	private readonly menu = new MenuManager()
	private readonly players = new Map<Player, PlayerModel>()

	public Draw() {
		/** @todo */
	}

	public PostDataUpdate() {
		/** @todo */
	}

	public EntityCreated(entity: Entity) {
		if (entity instanceof Player && !entity.IsSpectator) {
			this.players.set(entity, new PlayerModel(entity))
		}
		if (!(entity instanceof Hero) || !entity.IsRealHero) {
			return
		}
		const playerModel = this.getPlayerModel(entity)
		if (playerModel !== undefined) {
			this.menu.SpellMenu.AddHero(entity)
		}
	}

	public EntityDestroyed(entity: Entity) {
		if (entity instanceof Player) {
			this.players.delete(entity)
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
		this.getPlayerModel(owner)?.EntityDestroyed(entity)
	}

	public EntityTeamChanged(entity: Entity) {
		if (!(entity instanceof Player) || entity.IsSpectator) {
			return
		}
		if (!entity.IsValid) {
			this.players.delete(entity)
			return
		}
		const player = this.players.get(entity)
		if (player === undefined) {
			this.players.set(entity, new PlayerModel(entity))
		}
	}

	public UnitAbilitiesChanged(entity: Unit) {
		if (!(entity instanceof Hero || entity instanceof SpiritBear)) {
			return
		}
		if (entity instanceof Hero && !entity.IsRealHero) {
			return
		}
		this.getPlayerModel(entity)?.UnitAbilitiesChanged(
			this.menu.SpellMenu,
			entity.Spells.filter(abil => this.shouldBeValid(abil)) as Ability[]
		)
	}

	public UnitItemsChanged(entity: Unit) {
		if (!(entity instanceof Hero || entity instanceof SpiritBear)) {
			return
		}
		if (entity instanceof Hero && !entity.IsRealHero) {
			return
		}
		this.getPlayerModel(entity)?.UnitItemsChanged(
			this.menu.ItemMenu,
			entity.TotalItems.filter(abil => this.shouldBeValid(abil)) as Item[]
		)
	}

	private getPlayerModel(entity: Hero | SpiritBear) {
		let owner = entity.Owner
		if (owner === undefined) {
			return
		}
		if (!(owner instanceof Player)) {
			owner = owner.Owner
		}
		if (!(owner instanceof Player)) {
			return
		}
		return this.players.get(owner)
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
			(isItem && this.includesItems(abil)) ||
			(!isItem && this.excludeSpells(abil))
		) {
			return false
		}

		if (!isUltimate && abil.IsToggle) {
			return false
		}

		if ((isUltimate || isItem) && abil.IsPassive) {
			return true
		}

		return true
	}
})()

EventsSDK.on("Draw", () => bootstrap.Draw())

EventsSDK.on("PostDataUpdate", () => bootstrap.PostDataUpdate())

EventsSDK.on("EntityCreated", entity => bootstrap.EntityCreated(entity))

EventsSDK.on("EntityDestroyed", entity => bootstrap.EntityDestroyed(entity))

EventsSDK.on("EntityTeamChanged", entity => bootstrap.EntityTeamChanged(entity))

EventsSDK.on("UnitItemsChanged", entity => bootstrap.UnitItemsChanged(entity))

EventsSDK.on("UnitAbilitiesChanged", entity => bootstrap.UnitAbilitiesChanged(entity))
