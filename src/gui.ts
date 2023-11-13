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
	MathSDK,
	Modifier,
	Player,
	Rectangle,
	RendererSDK,
	Team,
	TextFlags,
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

	public RenderSpell(menu: MenuManager, items: Set<Item>, spells: Set<Ability>) {
		const position = this.tpIndicator
		if (position === undefined || this.isOpenHudContains(position)) {
			return
		}

		if (this.IsRenderTpScroll(menu, items)) {
			return
		}

		const abilMenu = menu.SpellMenu
		const abilily = this.getAbility(spells, abilMenu, abilMenu.OnlyUlti.value)
		if (abilily === undefined) {
			return
		}

		const cooldown = Math.ceil(abilily.Cooldown)

		const general = menu.General
		const isFormatTime = general.FormatTime.value
		const outlineAllyColor = menu.SpellMenu.OutlineAlly.SelectedColor
		const outlineEnemyColor = menu.SpellMenu.OutlineEnemy.SelectedColor
		const isCircle = general.ModeImages.SelectedID === EModeImages.Circles

		this.Image(
			abilily.TexturePath,
			abilily.ManaCost,
			cooldown,
			abilily.CooldownPercent,
			position,
			isCircle ? 0 : -1,
			outlineAllyColor,
			outlineEnemyColor,
			false,
			abilily.StackCount,
			isFormatTime
		)

		if (general.LevelState.value) {
			this.Level(abilily, cooldown, position, isCircle)
		}

		if (general.DurationState.value) {
			const cooldownDuration = Math.ceil(abilily.CooldownDuration)
			this.lvlOrChargesOrDuration(cooldownDuration, position, isCircle)
		}

		if (cooldown !== 0) {
			this.setItemsPosition(
				items.size !== 0,
				position,
				menu.ItemMenu.Team.SelectedID
			)
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
		const sizeIcon = new Vector2(GUIInfo.ScaleWidth(18), GUIInfo.ScaleHeight(18))
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

		const topBar = GUIInfo.TopBar
		const isDire = team === Team.Dire

		this.heroImage = isDire
			? topBar.DirePlayersHeroImages[teamSlot]
			: topBar.RadiantPlayersHeroImages[teamSlot]

		this.ultReadyIndicators = isDire
			? topBar.DirePlayersUltReadyIndicators[teamSlot]
			: topBar.RadiantPlayersUltReadyIndicators[teamSlot]

		if (skipBottomData) {
			return
		}

		this.manabar = isDire
			? topBar.DirePlayersManabars[teamSlot]
			: topBar.RadiantPlayersManabars[teamSlot]

		this.healthbar = isDire
			? topBar.DirePlayersHealthbars[teamSlot]
			: topBar.RadiantPlayersHealthbars[teamSlot]

		this.respawnTimer = isDire
			? topBar.DirePlayersRespawnTimers[teamSlot]
			: topBar.RadiantPlayersRespawnTimers[teamSlot]

		this.tpIndicator = isDire
			? topBar.DirePlayersTPIndicators[teamSlot]?.Clone()
			: topBar.RadiantPlayersTPIndicators[teamSlot]?.Clone()

		this.buyback = isDire
			? topBar.DirePlayersBuybacks[teamSlot]
			: topBar.RadiantPlayersBuybacks[teamSlot]

		this.salutes = isDire
			? topBar.DirePlayersSalutes[teamSlot]
			: topBar.RadiantPlayersSalutes[teamSlot]

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
		const sizeIcon = new Vector2(GUIInfo.ScaleWidth(16), GUIInfo.ScaleHeight(16))
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

	protected Image(
		texture: string,
		manaCost: number,
		cooldown: number,
		ratio: number,
		position: Rectangle,
		round = 0,
		colorOutlineAlly: Color,
		colorOutlineEnemy: Color,
		isTP = false,
		stackCount = 0,
		formatTime = false
	) {
		const hero = this.player.Hero
		if (hero === undefined || (!(cooldown > 0) && !isTP)) {
			return
		}

		const imageColor =
			hero.Mana < manaCost && this.IsAlive
				? GUIPlayer.NoManaAbilitiesColor
				: Color.White

		RendererSDK.Image(texture, position.pos1, round, position.Size, imageColor)

		const colorOutline =
			hero.Mana < manaCost && this.IsAlive
				? GUIPlayer.NoManaOutlineColor
				: !hero.IsEnemy()
				? colorOutlineAlly
				: colorOutlineEnemy

		const width = Math.round(position.Height / 12)
		if (round >= 0) {
			// only with ratio (cooldown)
			this.outerFillArc(position, ratio)
			RendererSDK.OutlinedCircle(position.pos1, position.Size, colorOutline, width)
		} else {
			// only with ratio (cooldown)
			this.outerRadial(position, ratio)
			RendererSDK.OutlinedRect(position.pos1, position.Size, width, colorOutline)
		}

		if (!(ratio > 0)) {
			return
		}

		if (round >= 0) {
			RendererSDK.Arc(
				-90,
				ratio,
				position.pos1,
				position.Size,
				false,
				Math.round(position.Height / 10),
				Color.Black
			)
		} else {
			const newPosition = position.Clone()
			const scale = GUIInfo.ScaleHeight(3)
			newPosition.pos1.AddScalarForThis(scale / 2)
			newPosition.pos2.SubtractScalarForThis(scale)
			RendererSDK.Radial(
				-90,
				ratio,
				newPosition.pos1,
				newPosition.Size,
				Color.Black,
				undefined,
				undefined,
				undefined,
				false,
				Math.round(newPosition.Height / 6),
				true
			)
		}

		const text = formatTime
			? cooldown > 60
				? MathSDK.FormatTime(cooldown)
				: cooldown.toFixed()
			: cooldown.toFixed()

		if (stackCount === 0) {
			RendererSDK.TextByFlags(text, position, 3)
			return
		}

		if (!(stackCount > 0) || !(cooldown > 0)) {
			return
		}

		const division = 1.8 // magic text size (% 4)
		const cooldownPos = position.Clone()
		cooldownPos.Height /= 2

		const stackCountStr =
			stackCount >= 1000
				? `${(stackCount / 1000).toFixed(1)}k`
				: stackCount.toString()

		// coolowns
		RendererSDK.TextByFlags(text, cooldownPos, division)

		// stacks
		position.pos1.AddScalarY(position.Height / 2)
		RendererSDK.TextByFlags(stackCountStr, position, division, TextFlags.Top)
	}

	protected IsRenderTpScroll(menu: MenuManager, items: Set<Item>) {
		const itemMenu = menu.ItemMenu
		if (!this.TeamState(itemMenu.Team.SelectedID) || !Input.IsKeyDown(VKeys.MENU)) {
			return false
		}

		const position = this.tpIndicator
		if (position === undefined) {
			return false
		}

		const item = Array.from(items).find(
			x =>
				x instanceof item_tpscroll ||
				x instanceof item_travel_boots ||
				x instanceof item_travel_boots_2
		)

		if (item === undefined || !itemMenu.Items.IsEnabled(item.Name)) {
			return false
		}

		const cooldown = Math.ceil(item.Cooldown)

		const general = menu.General
		const chargeState = general.ChargeState.value
		const isFormatTime = menu.General.FormatTime.value
		const outlineAllyColor = menu.SpellMenu.OutlineAlly.SelectedColor
		const outlineEnemyColor = menu.SpellMenu.OutlineEnemy.SelectedColor
		const isCircle = general.ModeImages.SelectedID === EModeImages.Circles

		this.Image(
			item.TexturePath,
			item.ManaCost,
			cooldown,
			item.CooldownPercent,
			position,
			isCircle ? 0 : -1,
			outlineAllyColor,
			outlineEnemyColor,
			true,
			0,
			isFormatTime
		)

		if (chargeState) {
			this.lvlOrChargesOrDuration(item.CurrentCharges, position, isCircle)
		}

		if (!items.size) {
			return true
		}

		this.setItemsPosition(true, position, itemMenu.Team.SelectedID)
		return true
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

	protected BuyBackReady(position: Rectangle, hasBuyBack: boolean) {
		if ((!this.player.IsEnemy() && !this.IsAlive) || !hasBuyBack) {
			return
		}
		const icon = ImageData.Paths.Icons
		const image = !this.IsAlive ? icon.buyback_header : icon.buyback_topbar_alive
		RendererSDK.Image(image, position.pos1, -1, position.Size)
	}

	protected Level(
		abilily: Ability,
		cooldown: number,
		position: Rectangle,
		isCircle: boolean
	) {
		if (!(cooldown > 0)) {
			return
		}

		if (!isCircle) {
			this.levelSquare(abilily, cooldown, position)
			return
		}

		this.lvlOrChargesOrDuration(abilily.Level, position, isCircle, true)
	}

	protected BarPosition(isMana = false) {
		return !this.IsAlive ? this.respawnTimer : isMana ? this.manabar : this.healthbar
	}

	private outerFillArc(position: Rectangle, ratio: number) {
		if (!(ratio > 0)) {
			return
		}

		const newPosition = position.Clone()
		const subtractSize = GUIInfo.ScaleHeight(4)
		newPosition.pos1.AddScalarForThis(subtractSize / 2)
		newPosition.pos2.SubtractScalarForThis(subtractSize)

		RendererSDK.Arc(
			-90,
			ratio,
			newPosition.pos1,
			newPosition.Size,
			true,
			Math.round(newPosition.Height / 4),
			Color.Black.SetA(120),
			undefined,
			undefined,
			false,
			true
		)
	}

	private outerRadial(position: Rectangle, ratio: number) {
		if (!(ratio > 0)) {
			return
		}
		RendererSDK.Radial(
			-90,
			ratio,
			position.pos1,
			position.Size,
			Color.Black.SetA(160)
		)
	}

	private lvlOrChargesOrDuration(
		value: number,
		recPosition: Rectangle,
		isCircle: boolean,
		isLevel = false
	) {
		if (!(value > 0)) {
			return
		}

		const right = recPosition.Right
		const color = Color.Black.SetA(180)

		const width = recPosition.Width * 0.33
		const position = recPosition.Clone()

		// since it's a square there's no point in height
		position.x = right - width
		position.y = !isLevel ? position.Top : position.Bottom - width

		position.Width = width
		position.Height = width

		if (!isCircle) {
			RendererSDK.FilledRect(position.pos1, position.Size, color)
		}

		if (isCircle) {
			RendererSDK.FilledCircle(position.pos1, position.Size, color)
		}

		RendererSDK.TextByFlags(value.toFixed(), position, value >= 100 ? 2 : 1.2)
	}

	private levelSquare(abilily: Ability, cooldown: number, position: Rectangle) {
		if (!(cooldown > 0) || abilily.MaxLevel <= 1) {
			return
		}

		const recPosition = position.Clone()
		const subtractSize = GUIInfo.ScaleHeight(5)

		recPosition.pos1.AddScalarForThis(subtractSize / 2)
		recPosition.pos2.SubtractScalarForThis(subtractSize)

		const levelWidth = Math.round(recPosition.Width / abilily.MaxLevel)

		const space = levelWidth * 0.07
		const levelDrawWidth = levelWidth - space * 2

		const levelHeight = position.Height * 0.07
		const posY = recPosition.Bottom - levelHeight

		const outlinedWidth = Math.round(levelWidth / 4)
		const image = ImageData.Paths.Icons.levelup_button_3

		const currLvl = abilily.Level
		for (let i = 0; i < currLvl; i++) {
			const lvlSize = new Vector2(levelDrawWidth, levelHeight)
			const lvlPosion = new Vector2(recPosition.x + space, posY)

			RendererSDK.OutlinedRect(lvlPosion, lvlSize, outlinedWidth, Color.Black)
			RendererSDK.Image(image, lvlPosion, -1, lvlSize)

			recPosition.pos1.AddScalarX(levelWidth)
			recPosition.pos2.SubtractScalarX(levelWidth)
		}
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
}
