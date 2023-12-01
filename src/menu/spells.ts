import {
	Ability,
	ArrayExtensions,
	Color,
	Hero,
	ImageData,
	invoker_emp,
	invoker_invoke,
	invoker_sun_strike,
	invoker_tornado,
	Menu
} from "github.com/octarine-public/wrapper/index"

import { EPopularSettings } from "../enums/EPopularSettings"

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
			isHash
				? `${Menu.Localization.Localize(hero.Name)}#${hero.Handle}`
				: hero.Name,
			hero.TexturePath(true)
		)

		this.Menu.Update()
		this.Menu.IsHidden = false
		this.Menu.SaveUnusedConfigs = true
		this.Abilities = this.Menu.AddImageSelector("spells_v1", [])
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
			...ArrayExtensions.orderBy(
				ArrayExtensions.orderBy(
					Array.from(this.TempAbilities.values()),
					x => !x[2] // sort by ulti
				),
				x => !x[1] // sort by disable
			).map(([newName]) => newName)
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
		ArrayExtensions.arrayRemove(this.Abilities.values, deleteName)
		this.TempAbilities.delete(deleteName)
		this.Abilities.Update()
	}

	protected DestroySpells() {
		for (const [name] of this.TempAbilities) {
			ArrayExtensions.arrayRemove(this.Abilities.values, name)
			this.TempAbilities.delete(name)
			this.Abilities.Update()
		}
	}
}

export class SpellMenu {
	public readonly Team: Menu.Dropdown
	public readonly OnlyUlti: Menu.Toggle

	public readonly OutlineAlly: Menu.ColorPicker
	public readonly OutlineEnemy: Menu.ColorPicker

	public readonly HeroesMenu = new Map<string, HeroMenu>()
	public readonly ExludedSpells = [
		"invoker_quas",
		"invoker_wex",
		"invoker_exort",
		"morphling_morph"
	]

	private readonly tree: Menu.Node
	private readonly heroesTree: Menu.Node

	constructor(menu: Menu.Node, team: string[]) {
		const hamburger = ImageData.Paths.Icons.icon_svg_hamburger
		this.tree = menu.AddNode("Abilities", hamburger)
		this.tree.SortNodes = false

		this.heroesTree = this.tree.AddNode("Heroes", hamburger)
		this.heroesTree.SortNodes = false
		this.heroesTree.SaveUnusedConfigs = true

		this.OnlyUlti = this.tree.AddToggle("Only ultimate", false)
		this.Team = this.tree.AddDropdown("Team", team, 1)

		this.OutlineAlly = this.tree.AddColorPicker(
			"Outline allies",
			Color.Green,
			"Cooldown outline abiliies"
		)

		this.OutlineEnemy = this.tree.AddColorPicker(
			"Outline enemies",
			Color.Red,
			"Cooldown outline abiliies"
		)
	}

	public IsEnabled(ability: Ability) {
		const owner = ability.Owner
		if (owner === undefined) {
			return false
		}
		const hash = `${owner.Name}_${owner.Handle}`
		const heroMenu = this.HeroesMenu.get(owner.Name)
		const heroMenuHash = this.HeroesMenu.get(hash)
		if (heroMenu !== undefined) {
			return heroMenu.Abilities.IsEnabled(ability.Name)
		}
		if (heroMenuHash !== undefined) {
			return heroMenuHash.Abilities.IsEnabled(ability.Name)
		}
		return false
	}

	public AddHero(hero: Hero) {
		if (!hero.IsValid || !hero.IsRealHero) {
			return
		}

		const hash = `${hero.Name}_${hero.Handle}`
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

		const hash = `${hero.Name}_${hero.Handle}`
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

	public AddSpell(hero: Nullable<Hero>, ability: Ability) {
		if (!hero?.IsValid || ability.IsPassive) {
			return
		}

		const hash = `${hero.Name}_${hero.Handle}`
		const heroMenu = this.HeroesMenu.get(hero.Name)
		const heroMenuHash = this.HeroesMenu.get(hash)

		if (heroMenuHash !== undefined && heroMenuHash.hero === hero) {
			this.addSpellMenu(heroMenuHash, ability)
		}

		if (heroMenu !== undefined && heroMenu.hero === ability.Owner) {
			this.addSpellMenu(heroMenu, ability)
		}
	}

	public PopularSettingsChanged(type: EPopularSettings) {
		switch (type) {
			case EPopularSettings.Minimal:
			case EPopularSettings.Moderate:
				this.Team.SelectedID = 2
				break
			case EPopularSettings.Maximum:
				this.Team.SelectedID = 1
				break
		}
	}

	public ResetSettings() {
		this.Team.SelectedID = 1
		this.OnlyUlti.value = false
		this.OutlineAlly.SelectedColor.CopyFrom(Color.Green)
		this.OutlineEnemy.SelectedColor.CopyFrom(Color.Red)

		for (const menu of this.HeroesMenu.values()) {
			for (const [name] of menu.Abilities.enabledValues) {
				if (name === "invoker_invoke") {
					menu.Abilities.enabledValues.set(name, false)
					continue
				}
				if (
					name === "invoker_emp" ||
					name === "invoker_tornado" ||
					name === "invoker_sun_strike" ||
					name === "invoker_deafening_blast"
				) {
					menu.Abilities.enabledValues.set(name, true)
					continue
				}
			}
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
