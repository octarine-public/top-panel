import { EPopularSettings } from "../enums/EPopularSettings"
import { ETeamState } from "../enums/ETeamState"
import { TopPanelIcons } from "./icons"
import { IconTextStyle, TextStyle, TextStyleMenu } from "./style"
import { CreateTeamSelect, SetTeams } from "./team"

type TempSpells = [string /** name */, boolean /** ulti */, boolean /** disable */]

class HeroMenu {
	public readonly Menu: Menu.Node
	public readonly Abilities: Menu.ImageSelector
	protected readonly TempAbilities = new Map<string, TempSpells>()

	constructor(
		root: Menu.Node,
		public readonly hero: Hero,
		public readonly isHash = false
	) {
		// node hero name
		this.Menu = root.AddNode(
			isHash ? `${Menu.Localization.Localize(hero.Name)}#${hero.Index}` : hero.Name,
			hero.TexturePath(true)
		)

		this.Menu.Update()
		this.Menu.IsHidden = false
		this.Menu.SaveUnusedConfigs = true
		this.Abilities = this.Menu.AddImageSelector("spells_v1", [])
		// the row's order is the priority: a tile dragged in the menu ranks the same way one
		// dragged on the top panel's picker does
		this.Abilities.Draggable = true
	}

	public AddSpell(
		name: string,
		isUltimate: boolean,
		isDisable: boolean,
		maxCooldown: number,
		defaultEnabled: boolean,
		defaultDisabled: boolean
	) {
		if (this.TempAbilities.has(name)) {
			return
		}

		this.TempAbilities.set(name, [name, isUltimate, isDisable])

		if (defaultDisabled) {
			if (!this.Abilities.enabledValues.has(name)) {
				this.Abilities.enabledValues.set(name, !defaultDisabled)
			}
		} else if (!this.Abilities.enabledValues.has(name)) {
			this.Abilities.enabledValues.set(
				name,
				defaultEnabled || isUltimate || (isDisable && maxCooldown >= 30)
			)
		}

		if (!this.Abilities.enabledValues.has(name)) {
			this.Abilities.enabledValues.set(
				name,
				!defaultDisabled ||
					defaultEnabled ||
					isUltimate ||
					(isDisable && maxCooldown >= 20)
			)
		}

		this.Abilities.values = [
			...Array.from(this.TempAbilities.values())
				.orderBy(x => !x[2])
				.orderBy(x => !x[1])
				.map(([newName]) => newName)
		]

		this.Abilities.Update()
	}

	public Destroy() {
		if (this.isHash) {
			this.Menu.IsHidden = true
			this.Abilities.IsHidden = true
			this.Menu.Update()

			this.Menu.DetachFromParent()
			this.Abilities.DetachFromParent()
			return
		}

		this.DestroySpells()
		this.Menu.IsHidden = true
		this.Abilities.IsHidden = true
		this.Menu.Update()
	}

	public DestroySpell(name: string) {
		const data = this.TempAbilities.get(name)
		if (data === undefined) {
			return
		}
		const deleteName = data[0]
		this.Abilities.values.remove(deleteName)
		this.TempAbilities.delete(deleteName)
		this.Abilities.Update()
	}

	protected DestroySpells() {
		for (const [name] of this.TempAbilities) {
			this.Abilities.values.remove(name)
			this.TempAbilities.delete(name)
			this.Abilities.Update()
		}
	}
}

export class SpellMenu {
	public readonly Team: Menu.MultiSelect
	public readonly State: Menu.Toggle
	public readonly OnlyUlti: Menu.Toggle

	public readonly OutlineAlly: Menu.ColorPicker
	public readonly OutlineEnemy: Menu.ColorPicker
	/** The rim an ability its owner cannot pay for is drawn with, whichever side it is on. */
	public readonly OutlineNoMana: Menu.ColorPicker
	public readonly Style: TextStyleMenu

	public readonly HeroesMenu = new Map<string, HeroMenu>()
	public readonly ExludedSpells = [
		"invoker_quas",
		"invoker_wex",
		"invoker_exort",
		"morphling_morph"
	]

	public readonly Tree: Menu.Node

	private readonly heroesTree: Menu.Node

	constructor(menu: Menu.Node) {
		this.Tree = menu.AddNode(
			"Abilities",
			TopPanelIcons.Abilities,
			"Cooldowns of the abilities you pick per hero"
		)
		this.Tree.SortNodes = false

		this.State = this.Tree.AddToggle(
			"Draw abilities",
			true,
			"Draw ability icons on the top panel"
		)
		this.State.IconPath = TopPanelIcons.Draw
		this.OnlyUlti = this.Tree.AddToggle(
			"Only ultimate",
			false,
			"Show only the ultimate"
		)
		this.OnlyUlti.IconPath = TopPanelIcons.Ultimate
		this.Team = CreateTeamSelect(this.Tree)

		this.OutlineAlly = this.Tree.AddColorPicker(
			"Outline allies",
			new Color(82, 224, 82), // #52E052
			"Outline of an allied ability on cooldown"
		)
		this.OutlineAlly.IconPath = TopPanelIcons.Outline

		this.OutlineEnemy = this.Tree.AddColorPicker(
			"Outline enemies",
			new Color(224, 82, 82), // #E05252
			"Outline of an enemy ability on cooldown"
		)
		this.OutlineEnemy.IconPath = TopPanelIcons.Outline

		// the shade the game's own top bar turns a teleport's ring once the mana runs short
		this.OutlineNoMana = this.Tree.AddColorPicker(
			"Outline no mana",
			new Color(50, 133, 188), // #3285BC
			"Outline of an ability its owner\nlacks the mana for"
		)
		this.OutlineNoMana.IconPath = TopPanelIcons.Outline

		// the cooldowns, stacks and badges of the icon; reads the game's own type until overridden
		this.Style = new TextStyleMenu(this.Tree, IconTextStyle)

		// the heroes of the match, each a fold of its abilities, in a section under the rows
		this.heroesTree = this.Tree.AddNode(
			"Heroes",
			TopPanelIcons.Heroes,
			"Pick the abilities to track for each hero"
		)
		this.heroesTree.SortNodes = false
		this.heroesTree.SaveUnusedConfigs = true
	}

	/** The type the cooldowns, stacks and badges are set in. */
	public get TextStyle(): TextStyle {
		return this.Style.Effective
	}

	/** The hero's row of tiles in the menu: its order is the priority, its ticks the choice. */
	public SelectorOf(hero: Hero): Nullable<Menu.ImageSelector> {
		return this.heroMenu(hero)?.Abilities
	}

	/** A single tile on in the row pins the displayed ability, even while it is ready. */
	public SelectedAbility(hero: Hero, abilities: readonly Ability[]): Nullable<Ability> {
		const selector = this.heroMenu(hero)?.Abilities
		if (selector === undefined) {
			return undefined
		}
		let selected: Nullable<string>
		for (const name of selector.values) {
			if (!selector.IsEnabled(name)) {
				continue
			}
			if (selected !== undefined) {
				return undefined
			}
			selected = name
		}
		return abilities.find(ability => ability.IsValid && ability.Name === selected)
	}

	/** Flips the ability's tile in the hero's row, as a click on it in the menu does. */
	public ToggleAbility(hero: Hero, ability: Ability): boolean {
		const selector = this.rowOf(hero, ability)
		if (selector === undefined) {
			return false
		}
		const name = ability.Name
		MenuSDK.SetImageEnabled(selector.entry, name, !selector.IsEnabled(name))
		MenuSDK.MarkEntryChanged(selector.entry)
		return true
	}

	/** Ranks the ability where `slot` stands in the hero's row, as a drag over its tile does. */
	public MoveAbility(hero: Hero, ability: Ability, slot: Ability): boolean {
		const selector = this.rowOf(hero, ability)
		if (selector === undefined || !slot.IsValid || slot.Owner !== hero) {
			return false
		}
		const from = selector.GetPriority(ability.Name)
		const to = selector.GetPriority(slot.Name)
		if (to < 0 || from === to) {
			return false
		}
		selector.MoveImage(from, to)
		MenuSDK.MarkEntryChanged(selector.entry)
		return true
	}

	/** The hero's row, provided the ability is theirs and has a tile in it. */
	private rowOf(hero: Hero, ability: Ability): Nullable<Menu.ImageSelector> {
		const selector = this.heroMenu(hero)?.Abilities
		return selector !== undefined &&
			hero.IsValid &&
			ability.IsValid &&
			ability.Owner === hero &&
			selector.GetPriority(ability.Name) >= 0
			? selector
			: undefined
	}

	private heroMenu(owner: Unit): Nullable<HeroMenu> {
		const hashed = this.HeroesMenu.get(`${owner.Name}_${owner.Index}`)
		if (hashed?.hero === owner) {
			return hashed
		}
		const named = this.HeroesMenu.get(owner.Name)
		return named?.hero === owner ? named : undefined
	}

	public AddHero(hero: Hero) {
		if (!hero.IsValid || !hero.IsRealHero) {
			return
		}

		const hash = `${hero.Name}_${hero.Index}`
		const heroMenu = this.HeroesMenu.get(hero.Name)
		const heroMenuHash = this.HeroesMenu.get(hash)

		if (heroMenu === undefined) {
			this.HeroesMenu.set(hero.Name, new HeroMenu(this.heroesTree, hero))
			return
		}

		if (heroMenuHash === undefined) {
			this.HeroesMenu.set(hash, new HeroMenu(this.heroesTree, hero, true))
			return
		}

		if (heroMenu !== undefined) {
			heroMenu.Menu.IsHidden = false
			heroMenu.Menu.Update()
		}

		if (heroMenuHash !== undefined) {
			heroMenu.Menu.IsHidden = false
			heroMenu.Menu.Update()
		}
	}

	public DestroyHero(hero: Hero) {
		if (hero.IsValid) {
			return
		}

		const hash = `${hero.Name}_${hero.Index}`
		const heroMenu = this.HeroesMenu.get(hero.Name)
		const heroMenuHash = this.HeroesMenu.get(hash)

		if (heroMenuHash !== undefined && heroMenuHash.hero === hero) {
			heroMenuHash.Destroy()
			this.HeroesMenu.delete(hash)
		}

		if (heroMenu !== undefined && heroMenu.hero === hero) {
			heroMenu.Destroy()
			this.HeroesMenu.delete(hero.Name)
		}
	}

	public AddSpell(hero: Nullable<Hero>, abilities: Ability[]) {
		if (!hero?.IsValid) {
			return
		}
		for (let index = 0, end = abilities.length; index < end; index++) {
			const ability = abilities[index]
			if (ability.IsPassive) {
				continue
			}
			const hash = `${hero.Name}_${hero.Index}`
			const heroMenu = this.HeroesMenu.get(hero.Name)
			const heroMenuHash = this.HeroesMenu.get(hash)
			if (heroMenuHash !== undefined && heroMenuHash.hero === hero) {
				this.addSpellMenu(heroMenuHash, ability)
			}
			if (heroMenu !== undefined && heroMenu.hero === ability.Owner) {
				this.addSpellMenu(heroMenu, ability)
			}
		}
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		switch (type) {
			case EPopularSettings.Minimal:
			case EPopularSettings.Moderate:
				SetTeams(this.Team, ETeamState.Enemies)
				break
			case EPopularSettings.Maximum:
				SetTeams(this.Team, ETeamState.Enemies, ETeamState.Allies)
				break
		}
	}

	private addSpellMenu(heroMenu: HeroMenu, ability: Ability) {
		heroMenu.AddSpell(
			ability.Name,
			ability.IsUltimate,
			false, // TODO: isIDisable(ability)
			ability.MaxCooldown,
			this.enabledByDefault(ability),
			this.disabledByDefault(ability)
		)
	}

	private enabledByDefault(ability: Ability) {
		return (
			ability instanceof invoker_sun_strike ||
			ability instanceof invoker_emp ||
			ability instanceof invoker_tornado
		)
	}

	private disabledByDefault(ability: Ability) {
		return ability instanceof invoker_invoke
	}
}
