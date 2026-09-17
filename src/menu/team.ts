import { ETeamState } from "../enums/ETeamState"
import { TopPanelIcons } from "./icons"

const teamNames = ["Enemies", "Allies"]

/**
 * Declares the team row of a page: a tick per side instead of a dropdown listing every
 * combination of them. Both sides are on to begin with.
 * @example
 * this.Team = CreateTeamSelect(this.Tree)
 */
export function CreateTeamSelect(
	node: Menu.Node,
	name = "Team",
	icon: string = TopPanelIcons.Team
): Menu.MultiSelect {
	const selection = node.AddMultiSelect(name, teamNames, teamNames, "Show on team")
	selection.IconPath = icon
	return selection
}

/** Puts the row on exactly the sides named, which is what a preset does. */
export function SetTeams(selection: Menu.MultiSelect, ...teams: ETeamState[]): void {
	selection.SelectedNames = teams.map(team => teamNames[team])
}
