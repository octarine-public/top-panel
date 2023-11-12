import {
	Ability,
	ArrayExtensions,
	Color,
	GameState,
	GUIInfo,
	ImageData,
	Input,
	Item,
	item_tpscroll,
	item_travel_boots,
	item_travel_boots_2,
	Modifier,
	Player,
	Rectangle,
	RendererSDK,
	Team,
	Vector2,
	VKeys
} from "github.com/octarine-public/wrapper/index"

import { EModeImages } from "./enums/EModeImages"
import { MenuManager } from "./menu"
import { BarsMenu } from "./menu/bars"
import { RunesMenu } from "./menu/runes"
import { SpellMenu } from "./menu/spells"

export class GUIPlayer {
	public static SalutesOffset = 0
	public static BlackOutManaColor = new Color(21, 34, 65)
	public static NoManaOutlineColor = new Color(3, 82, 252)
	public static BlackOutHealthColor = new Color(30, 41, 17)
	public static NoManaAbilitiesColor = new Color(77, 131, 247)

	public static runeData = new Map<string, Color>([
		["modifier_rune_invis", Color.Fuchsia],
		["modifier_rune_haste", Color.Red],
		["modifier_rune_arcane", Color.Fuchsia],
		["modifier_rune_doubledamage", Color.Aqua]
	])

	private buyback: Nullable<Rectangle>
	private salutes: Nullable<Rectangle>
	private manabar: Nullable<Rectangle>
	private healthbar: Nullable<Rectangle>
	private heroImage: Nullable<Rectangle>
	private respawnTimer: Nullable<Rectangle>
	private tpIndicator: Nullable<Rectangle>
	private ultReadyIndicators: Nullable<Rectangle>

	private readonly overridePosition = new Rectangle()

	constructor(private readonly player: Player) {}

	protected get GUIReady() {
		return GUIInfo !== undefined && GUIInfo.TopBar !== undefined
	}

	protected get IsAlive() {
		return this.player.Hero?.IsAlive ?? true
	}

	public RenderMana(menu: BarsMenu) {
		const stateMP = this.TeamState(menu.TeamMana.SelectedID)
		const stateHP = this.TeamState(menu.TeamHealth.SelectedID)

		const position = this.BarPosition(stateHP)
		if (position === undefined || this.isOpenHudContains(position)) {
			return
		}

		position.pos1.CopyTo(this.overridePosition.pos1)
		position.Size.CopyTo(this.overridePosition.Size)

		if (!this.IsAlive || !stateMP) {
			return
		}

		this.Bars(position, true)
	}

	public RenderHealth(menu: BarsMenu) {
		const position = this.BarPosition()
		const stateHP = this.TeamState(menu.TeamHealth.SelectedID)
		if (position === undefined || this.isOpenHudContains(position)) {
			return
		}

		position.pos1.CopyTo(this.overridePosition.pos1)
		position.Size.CopyTo(this.overridePosition.Size)

		if (!stateHP || !this.IsAlive) {
			return
		}

		this.Bars(position, false)
	}

	public RenderSpell(menu: MenuManager, items: Set<Item>, abiliies: Set<Ability>) {
		const tpIndicator = this.tpIndicator
		if (tpIndicator === undefined || this.isOpenHudContains(tpIndicator)) {
			return
		}

		if (this.TpScroll(menu, items)) {
			return
		}

		const abilMenu = menu.SpellMenu
		const abilily = this.getAbility(abiliies, abilMenu, abilMenu.OnlyUlti.value)
		if (abilily === undefined) {
			return
		}

		const general = menu.General
		const remaining = Math.ceil(abilily.Cooldown)
		const isFormatTime = general.FormatTime.value
		const outlineAllyColor = menu.SpellMenu.OutlineAlly.SelectedColor
		const outlineEnemyColor = menu.SpellMenu.OutlineEnemy.SelectedColor
		const isCircle = general.ModeImages.SelectedID === EModeImages.Circles

		if (general.LevelState.value) {
			// this.Level(abilily, remaining, position, isCircle)
		}

		if (general.DurationState.value) {
			// this.TextChargeOrLevel(
			// 	Math.ceil(abilily.Cooldown),
			// 	position,
			// 	isCircle
			// )
		}

		if (remaining !== 0) {
			// this.SetPositionItems(
			// 	items.size !== 0,
			// 	position,
			// 	menu.ItemMenu.Team.SelectedID
			// )
		}
	}

	public RenderRune(menu: RunesMenu) {
		if (!this.TeamState(menu.Team.SelectedID)) {
			return
		}

		const hero = this.player.Hero
		const ultPosition = this.ultReadyIndicators
		if (ultPosition === undefined || hero === undefined) {
			return
		}

		const position = ultPosition.Clone()
		const scale = GUIInfo.ScaleHeight(10)
		const sizeIcon = new Vector2(GUIInfo.ScaleWidth(18), GUIInfo.ScaleWidth(18))
		const positionUlti = position.pos1.SubtractScalarY(sizeIcon.y / 2 - 3)

		if (this.player.Team === Team.Radiant) {
			positionUlti.AddScalarX(position.Width - sizeIcon.x + scale)
		} else {
			positionUlti.SubtractScalarX(scale)
		}

		const arrRuneNames = Array.from(GUIPlayer.runeData.keys())
		const modifier = hero.GetAnyBuffByNames(arrRuneNames)
		if (modifier === undefined) {
			return
		}

		this.cooldownRuneBar(modifier)
		const newName = modifier.Name.replace("modifier_rune_", "")
		RendererSDK.Image(ImageData.GetRune(newName, true), positionUlti, -1, sizeIcon)
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

		this.setSalutesOffset()

		if (GUIPlayer.SalutesOffset !== 0) {
			this.tpIndicator.Add(new Vector2(0, GUIPlayer.SalutesOffset))
		}

		if (this.player.BuyBackColdown > 0 && !this.IsAlive) {
			this.tpIndicator.Add(new Vector2(0, 10))
		}

		this.setSalutesOffset()
	}

	public TeamState(selectedID: number) {
		return (
			selectedID === 1 ||
			(selectedID === 2 && this.player.IsEnemy()) ||
			(selectedID === 3 && !this.player.IsEnemy())
		)
	}

	public RenderIconUltimate(menu: MenuManager, abiliies: Set<Ability>) {
		const basePosition = this.ultReadyIndicators
		if (basePosition === undefined || this.player.Hero === undefined) {
			return
		}

		const abilily = this.getAbility(abiliies, menu.SpellMenu, true, true, true)
		if (abilily === undefined || !(abilily.Level > 0) || !abilily.IsUltimate) {
			return
		}

		const position = basePosition.Clone()
		const remaining = Math.ceil(abilily.Cooldown)
		const sizeIcon = new Vector2(GUIInfo.ScaleWidth(16), GUIInfo.ScaleWidth(16))
		const positionUlti = position.Center.SubtractForThis(sizeIcon.DivideScalar(2))

		let imageUlti = ""
		if (!(remaining > 0)) {
			imageUlti = ImageData.Paths.Icons.ult_ready
		}

		if (remaining !== 0) {
			imageUlti = ImageData.Paths.Icons.ult_cooldown
		}

		if (this.player.Hero.Mana < abilily.ManaCost) {
			imageUlti = ImageData.Paths.Icons.ult_no_mana
		}

		RendererSDK.Image(imageUlti, positionUlti, -1, sizeIcon)
	}

	protected Bars(position: Rectangle, isMana: boolean) {
		const hero = this.player.Hero
		if (hero === undefined) {
			return
		}

		const size = position.Size.Clone()
		const percent = !isMana ? hero.HPPercentDecimal : hero.ManaPercentDecimal

		const image = !isMana
			? hero.IsEnemy()
				? ImageData.Paths.Icons.topbar_health_dire
				: ImageData.Paths.Icons.topbar_health
			: ImageData.Paths.Icons.topbar_mana

		const blackInside = !isMana
			? GUIPlayer.BlackOutHealthColor
			: GUIPlayer.BlackOutManaColor

		RendererSDK.Image(image, position.pos1, -1, size, blackInside)
		RendererSDK.Image(
			image,
			position.pos1,
			-1,
			size.MultiplyScalarX(Math.max(percent, 0)),
			Color.White
		)
	}

	protected TpScroll(menu: MenuManager, items: Set<Item>) {
		if (
			!this.TeamState(menu.ItemMenu.Team.SelectedID) ||
			!Input.IsKeyDown(VKeys.MENU)
		) {
			return false
		}

		const tpIndicator = this.tpIndicator
		if (tpIndicator === undefined) {
			return false
		}

		const item = Array.from(items).find(
			x =>
				x instanceof item_tpscroll ||
				x instanceof item_travel_boots ||
				x instanceof item_travel_boots_2
		)

		if (item === undefined || !menu.ItemMenu.Items.IsEnabled(item.Name)) {
			return false
		}

		const manaCost = item.ManaCost
		const isFormatTime = menu.General.FormatTime.value
		const remaining = Math.ceil(item.Cooldown)

		const general = menu.General
		const chargeState = general.ChargeState.value
		const outlineAllyColor = menu.SpellMenu.OutlineAlly.SelectedColor
		const outlineEnemyColor = menu.SpellMenu.OutlineEnemy.SelectedColor
		const isCircle = general.ModeImages.SelectedID === EModeImages.Circles

		// this.Image(
		// 	item.TexturePath,
		// 	manaCost,
		// 	remaining,
		// 	item.PercentRemainingCooldown,
		// 	position,
		// 	isCircle ? 0 : -1,
		// 	outlineAllyColor,
		// 	outlineEnemyColor,
		// 	true,
		// 	0,
		// 	isFormatTime
		// )

		if (chargeState) {
			// this.TextChargeOrLevel(item.Charges, position, isCircle)
		}

		if (!items.size) {
			return true
		}

		// this.setPositionItems()
		return true
	}

	protected Image(
		texture: string,
		manaCost: number,
		remaining: number,
		ratio: number,
		position: Rectangle,
		round = 0,
		colorOutlineAlly: Color,
		colorOutlineEnemy: Color,
		isTP = false,
		stackCount = 0,
		formatTime = false
	) {
		/** @todo */
	}

	protected ImageStackCount(
		stackCount: number,
		remaining: number,
		position: Rectangle
	) {
		/** @todo */
	}

	protected Level(
		abilily: Ability,
		remaining: number,
		position: Rectangle,
		isCircle: boolean
	) {
		/** @todo */
	}

	protected Charges(
		abilily: Ability,
		remaining: number,
		position: Rectangle,
		isCircle: boolean
	) {
		/** @todo */
	}

	protected BarPosition(isMana = false) {
		return !this.IsAlive ? this.respawnTimer : isMana ? this.manabar : this.healthbar
	}

	private outerArc(position: Rectangle, ratio: number) {
		/** @todo */
	}

	private outerRadial(position: Rectangle, ratio: number) {
		// if (!(ratio > 0)) {
		// 	return
		// }
		// RendererSDK.Radial(
		// 	-90,
		// 	ratio,
		// 	position.pos1,
		// 	position.pos2,
		// 	Color.Black.SetA(160)
		// )
	}

	private textChargeOrLevel(
		value: number,
		recPosition: Rectangle,
		isCircle: boolean,
		isLevel = false
	) {
		/** @todo */
	}

	private levelSquare(abilily: Ability, remaining: number, position: Rectangle) {
		if (!(remaining > 0) || abilily.MaxLevel <= 1) {
			return
		}

		const recPosition = position.Clone()
		/** @todo */
	}

	private cooldownRuneBar(modifier: Modifier) {
		const position = this.BarPosition()
		if (position === undefined) {
			return
		}
		const cooldownRatio = modifier.RemainingTime / modifier.Duration
		const color = GUIPlayer.runeData.get(modifier.Name)
		if (color !== undefined) {
			this.cooldownBar(position, cooldownRatio, color)
		}
	}

	private cooldownBar(position: Rectangle, percentage: number, color: Color) {
		const alpha = 160
		const newPosition = position.Clone()

		newPosition.pos1.SubtractScalarY(position.Height / 2 - 1)
		newPosition.Height /= 3

		const size = newPosition.Size.MultiplyScalarX(Math.max(percentage, 0))
		RendererSDK.FilledRect(newPosition.pos1, newPosition.Size, Color.Black.SetA(200))
		RendererSDK.FilledRect(newPosition.pos1, size, color.SetA(alpha))
		RendererSDK.OutlinedRect(
			newPosition.pos1,
			newPosition.Size,
			GUIInfo.ScaleHeight(3),
			Color.Black.SetA(alpha)
		)
	}

	private getAbility(
		arr: Set<Ability>,
		menu: SpellMenu,
		onlyUltimate = false,
		ignoreCooldown = false,
		ignoreEnabled?: boolean
	) {
		const abilities = Array.from(arr)

		// TODO: sort by disable
		const sortByDisable = //ArrayExtensions.orderBy(
			abilities.filter(
				x =>
					(!onlyUltimate || x.IsUltimate) &&
					(ignoreCooldown || x.Cooldown > 0) && // TODO: add RemainingCooldown ?
					((x.IsUltimate && x.IsPassive) || ignoreEnabled || menu.IsEnabled(x))
			)
		//x => !(x instanceof ActiveAbility && isIDisable(x))
		//)

		// sort by last time
		const orderByTime = ArrayExtensions.orderBy(
			sortByDisable,
			x => GameState.RawGameTime > x.CreateTime
		)

		// sort by ultimate
		return ArrayExtensions.orderBy(orderByTime, x => !x.IsUltimate)[0]
	}

	private isOpenHudContains(position: Nullable<Rectangle>) {
		if (GUIInfo === undefined || position === undefined) {
			return false
		}

		if (
			Input.IsShopOpen &&
			(GUIInfo.OpenShopMini.GuideFlyout.Contains(position.pos1) ||
				GUIInfo.OpenShopLarge.GuideFlyout.Contains(position.pos1))
		) {
			return true
		}

		if (
			Input.IsScoreboardOpen &&
			GUIInfo.Scoreboard.Background.Contains(position.pos1)
		) {
			return true
		}

		return false
	}

	private setSalutesOffset() {
		if (!this.player.IsLocalPlayer) {
			return
		}
		if (!Input.IsKeyDown(VKeys.MENU)) {
			GUIPlayer.SalutesOffset = 0
			return
		}
		if (!(this.player.AvailableSalutes > 0)) {
			GUIPlayer.SalutesOffset = 0
			return
		}
		if (this.player.TimeOfLastSaluteSent + 30 > GameState.RawGameTime) {
			GUIPlayer.SalutesOffset = 0
			return
		}
		GUIPlayer.SalutesOffset = this.salutes?.Height ?? 0
	}

	private setItemsPosition(hasItems: boolean, position: Rectangle, teamState: number) {
		if (!hasItems || !this.TeamState(teamState)) {
			return
		}
		const copy = position.Clone()
		copy.Width = this.overridePosition.Width
		copy.Height += GUIInfo.ScaleWidth(3)
		copy.pos1.SubtractScalarX(GUIInfo.ScaleWidth(5))
		this.overridePosition.pos1.CopyFrom(copy.pos1)
		this.overridePosition.pos2.CopyFrom(copy.pos2)
	}
}
