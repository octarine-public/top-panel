import {
	GUIInfo,
	Player,
	Rectangle,
	Team
} from "github.com/octarine-public/wrapper/index"

import { BarsMenu } from "./menu/bars"

export class GUIPlayer {
	private buyback: Nullable<Rectangle>
	private salutes: Nullable<Rectangle>
	private manabar: Nullable<Rectangle>
	private healthbar: Nullable<Rectangle>
	private heroImage: Nullable<Rectangle>
	private respawnTimer: Nullable<Rectangle>
	private tpIndicator: Nullable<Rectangle>
	private ultReadyIndicators: Nullable<Rectangle>

	private readonly position = new Rectangle()

	constructor(private readonly player: Player) {}

	protected get GUIReady() {
		return GUIInfo !== undefined && GUIInfo.TopBar !== undefined
	}

	protected get IsAlive() {
		return this.player.Hero?.IsAlive ?? true
	}

	public DrawHealth(_menu: BarsMenu) {
		// const position = this.BarPosition()
	}

	public UpdateGUI(skipBottomData?: boolean) {
		const team = this.player.Team
		const teamSlot = this.player.TeamSlot

		this.heroImage =
			team === Team.Dire
				? GUIInfo.TopBar.DirePlayersHeroImages[teamSlot]
				: GUIInfo.TopBar.RadiantPlayersHeroImages[teamSlot]

		this.ultReadyIndicators =
			team === Team.Dire
				? GUIInfo.TopBar.DirePlayersUltReadyIndicators[teamSlot]
				: GUIInfo.TopBar.RadiantPlayersUltReadyIndicators[teamSlot]

		if (skipBottomData) {
			return
		}

		this.manabar =
			team === Team.Dire
				? GUIInfo.TopBar.DirePlayersManabars[teamSlot]
				: GUIInfo.TopBar.RadiantPlayersManabars[teamSlot]

		this.healthbar =
			team === Team.Dire
				? GUIInfo.TopBar.DirePlayersHealthbars[teamSlot]
				: GUIInfo.TopBar.RadiantPlayersHealthbars[teamSlot]

		this.respawnTimer =
			team === Team.Dire
				? GUIInfo.TopBar.DirePlayersRespawnTimers[teamSlot]
				: GUIInfo.TopBar.RadiantPlayersRespawnTimers[teamSlot]

		this.tpIndicator =
			team === Team.Dire
				? GUIInfo.TopBar.DirePlayersTPIndicators[teamSlot]?.Clone()
				: GUIInfo.TopBar.RadiantPlayersTPIndicators[teamSlot]?.Clone()

		this.buyback =
			team === Team.Dire
				? GUIInfo.TopBar.DirePlayersBuybacks[teamSlot]
				: GUIInfo.TopBar.RadiantPlayersBuybacks[teamSlot]

		this.salutes =
			team === Team.Dire
				? GUIInfo.TopBar.DirePlayersSalutes[teamSlot]
				: GUIInfo.TopBar.RadiantPlayersSalutes[teamSlot]
	}

	protected BarPosition(isMana = false) {
		return !this.IsAlive ? this.respawnTimer : isMana ? this.manabar : this.healthbar
	}
}
