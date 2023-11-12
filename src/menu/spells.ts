import {
	ArrayExtensions,
	Color,
	GameState,
	Hero,
	ImageData,
	Menu
} from "github.com/octarine-public/wrapper/index"

import { EPopularSettings } from "../enums/EPopularSettings"

type TempSpells = [
	string /** name */,
	boolean /** ulti */,
	number /** last add time */,
	boolean /** disable */
]

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
			ImageData.GetHero(hero.Name, true)
		)

		this.Menu.Update()
		this.Menu.IsHidden = false
		this.Menu.SaveUnusedConfigs = true
		this.Abilities = this.Menu.AddImageSelector("Spells_v1", [])
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

		this.TempAbilities.set(name, [name, isUltimate, GameState.RawGameTime, isDisable])

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
					ArrayExtensions.orderBy([...this.TempAbilities.values()], x => !x[3]), // sort by ulti
					x => GameState.RawGameTime > x[2] // sort by last time
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
	public readonly ExludedSpells = ["invoker_quas", "invoker_wex", "invoker_exort"]

	private readonly iconNode = "icons/menu/hamburger.svg"

	private readonly tree: Menu.Node
	private readonly heroesTree: Menu.Node

	constructor(menu: Menu.Node, team: string[]) {
		this.tree = menu.AddNode("Abilities", this.iconNode)
		this.tree.SortNodes = false

		this.heroesTree = this.tree.AddNode("Heroes", this.iconNode)
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
}
