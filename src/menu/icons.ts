const iconsPath = `${__OCT_PACKAGE_ROOT__}/scripts_files/top-panel/icons`

/**
 * The drawings offered for the page's own icon. One of them rides
 * {@link TopPanelIcons.TopPanel}; the rest wait their turn.
 */
export const PageIcons = {
	/** Three hero portraits in a row, each under the bar the script draws over it. */
	HeroBars: `${iconsPath}/hero-bars.svg`,
	/** The screen with its top band cut into the two team sides and the clock between. */
	Slots: `${iconsPath}/slots.svg`,
	/** The two team blocks hanging off the top edge, the timer column between them. */
	Teams: `${iconsPath}/teams.svg`
} as const

/** Icons of the top panel menu: the page, its tabs, their sections and the rows inside. */
export const TopPanelIcons = {
	TopPanel: PageIcons.HeroBars,
	// tabs
	General: Menu.Icons.Settings2,
	Bars: Menu.Icons.Activity,
	Abilities: Menu.Icons.Zap,
	Items: Menu.Icons.ItemList,
	Other: Menu.Icons.Puzzle,
	Style: Menu.Icons.Type,
	// sections
	Heroes: Menu.Icons.IconJuggernaut,
	Runes: Menu.Icons.Sparkles,
	BuyBack: `${iconsPath}/coins.svg`,
	LastHits: Menu.Icons.IconCreeps,
	// rows
	Team: Menu.Icons.ListFilter,
	Popular: Menu.Icons.StarBadge,
	Shape: Menu.Icons.SquareStack,
	Rounding: Menu.Icons.Radius,
	Health: Menu.Icons.Heart,
	Mana: `${iconsPath}/mana.svg`,
	Level: ImageData.Icons.icon_svg_level,
	Charge: ImageData.Icons.icon_svg_charges,
	Duration: ImageData.Icons.icon_svg_duration,
	FogTime: ImageData.Icons.icon_svg_fow_time,
	FormatTime: ImageData.Icons.icon_svg_format_time,
	Draw: Menu.Icons.IconEye,
	Ultimate: Menu.Icons.Bomb,
	Outline: Menu.Icons.Palette,
	Background: Menu.Icons.BackdropSoft,
	ItemList: Menu.Icons.GridPick,
	Font: Menu.Icons.Type,
	TextSize: Menu.Icons.TextSize,
	TextEffect: Menu.Icons.TextDots,
	Palette: Menu.Icons.Palette,
	Opacity: Menu.Icons.Checkerboard
} as const
