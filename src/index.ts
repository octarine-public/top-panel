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

import { MenuManager } from "./menu"
import { PlayerModel } from "./models/player"

export const bootstrap = new (class CBootstrap {
	private readonly menu = new MenuManager()
	private readonly players = new Map<Player, PlayerModel>()

	public Draw() {
		/** @todo */
	}

	public PostDataUpdate() {
		/** @todo */
		console.log(this.players)
	}

	public EntityCreated(entity: Entity) {
		if (entity instanceof Player && !entity.IsSpectator) {
			this.players.set(entity, new PlayerModel(entity))
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
		if (owner instanceof Hero || owner instanceof SpiritBear) {
			this.GetPlayerModel(owner)?.EntityDestroyed(entity)
		}
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

	public UnitAbilitiesChanged(entity: Entity) {
		if (!(entity instanceof Hero || entity instanceof SpiritBear)) {
			return
		}
		if (entity instanceof Hero && !entity.IsRealHero) {
			return
		}
		this.GetPlayerModel(entity)?.UnitAbilitiesChanged(
			entity.Spells.filter(abil => abil?.IsValid) as Ability[]
		)
	}

	public UnitItemsChanged(entity: Entity) {
		if (!(entity instanceof Hero || entity instanceof SpiritBear)) {
			return
		}
		if (entity instanceof Hero && !entity.IsRealHero) {
			return
		}
		this.GetPlayerModel(entity)?.UnitItemsChanged(
			entity.TotalItems.filter(item => item?.IsValid) as Item[]
		)
	}

	private GetPlayerModel(entity: Hero | SpiritBear) {
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
})()

EventsSDK.on("Draw", () => bootstrap.Draw())

EventsSDK.on("PostDataUpdate", () => bootstrap.PostDataUpdate())

EventsSDK.on("EntityCreated", entity => bootstrap.EntityCreated(entity))

EventsSDK.on("EntityDestroyed", entity => bootstrap.EntityDestroyed(entity))

EventsSDK.on("EntityTeamChanged", entity => bootstrap.EntityTeamChanged(entity))

EventsSDK.on("UnitItemsChanged", entity => bootstrap.UnitItemsChanged(entity))

EventsSDK.on("UnitAbilitiesChanged", entity => bootstrap.UnitAbilitiesChanged(entity))
