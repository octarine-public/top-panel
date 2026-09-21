// Run with node tools/ability-picker.test.cjs. Exercises the production code with SDK fakes.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const ts = require("typescript")

class Vector2 {
	constructor(x = 0, y = 0) { this.x = x; this.y = y }
	SetVector(x, y) { this.x = x; this.y = y; return this }
	CopyFrom(p) { return this.SetVector(p.x, p.y) }
	Add(p) { return new Vector2(this.x + p.x, this.y + p.y) }
}
class Rectangle {
	constructor(a = new Vector2(), b = new Vector2()) { this.pos1 = a; this.pos2 = b }
	get x() { return this.pos1.x }
	get y() { return this.pos1.y }
	get Right() { return this.pos2.x }
	get Bottom() { return this.pos2.y }
	get Width() { return this.Right - this.x }
	get Height() { return this.Bottom - this.y }
	set Width(w) { this.pos2.x = this.x + w }
	set Height(h) { this.pos2.y = this.y + h }
	get Size() { return new Vector2(this.Width, this.Height) }
	get Center() { return new Vector2(this.x + this.Width / 2, this.y + this.Height / 2) }
	Clone() { return new Rectangle(new Vector2(this.x, this.y), new Vector2(this.Right, this.Bottom)) }
	Contains(p) { return p.x >= this.x && p.x < this.Right && p.y >= this.y && p.y < this.Bottom }
}
class Color {
	constructor(r = 0, g = 0, b = 0, a = 255) { this.r = r; this.g = g; this.b = b; this.a = a }
	CopyFrom(c) { this.r = c.r; this.g = c.g; this.b = c.b; this.a = c.a; return this }
	SetA(a) { this.a = a; return this }
	SetR(r) { this.r = r; return this }
	SetG(g) { this.g = g; return this }
	SetB(b) { this.b = b; return this }
	static White = new Color(255, 255, 255)
	static WhiteReadonly = new Color(255, 255, 255)
}
let now = 1000
let overlayAllowed = true
let foreignOverlay
let persisted = 0
let marked = 0
const moves = []
const events = {}
const draws = []
const imageSlots = []
const registrations = []
const tweens = new Set()
const sdk = {
	Vector2, Rectangle, Color,
	VKeys: { ESCAPE: 27 }, VMouseKeys: { MK_LBUTTON: 1, MK_RBUTTON: 2 },
	InputManager: { CursorOnScreen: new Vector2() },
	RendererSDK: { WindowSize: new Vector2(1920, 1080) },
	GUIInfo: { ScaleHeight: x => x }, hrtime: () => now,
	EventsSDK: { on: (name, handler) => { events[name] = handler } },
	Menu: { Localization: { Localize: x => x } },
	MenuSDK: {
		/** A tween that lands on the next tick, so a frame can be drawn between a start and its end. */
		Tween: class {
			constructor(initial, apply) { this.Value = initial; this.apply = apply; this.pending = undefined }
			To(target, duration, ease, done) { this.pending = { target, done }; tweens.add(this) }
			Set(value) { this.Value = value; this.apply(value) }
			Cancel() { this.pending = undefined }
		},
		tickTweens() {
			for (const tween of tweens) {
				const pending = tween.pending
				tween.pending = undefined
				if (pending !== undefined) { tween.Set(pending.target); pending.done?.() }
			}
			tweens.clear()
		},
		Theme: { AccentHex: "#010203", RadiusScale: 1 },
		MenuFlags: { HoverAnimation: false },
		Duration: { Hover: 150, Reveal: 300 },
		Ease: { Out: 1, Pop: 3 },
		EThemeScope: { Panels: 1 },
		DpToPx: x => x,
		HudColorOf: () => new Color(1, 2, 3),
		Canvas: class {
			Clear() { draws.length = 0 }
			Rect() {}
			TextIn() {}
		},
		EPanelLayer: { Screen: 1 },
		HudCard: {
			Frame() {},
			Plate() {},
			Image(texture, position, size, color, alpha) {
				imageSlots.push(texture)
				if (alpha === 0) return
				draws.push({ texture, position: new Vector2(position.x, position.y), side: size.x, alpha })
			}
		},
		HudCardRadius: 10,
		HudColors: { accent: new Color(1, 2, 3), title: new Color(255, 255, 255) },
		SetActiveSurface() {},
		setHudScale() {},
		HostCanDrawOverlays: () => overlayAllowed,
		HostInputCaptured: () => false,
		MenuManager: { IsOpen: false },
		SetImageEnabled: (entry, name, enabled) => {
			if (entry.enabled.get(name) !== enabled) {
				entry.enabled.set(name, enabled)
				persisted++
			}
		},
		MarkEntryChanged: () => { marked++ },
		HudSurfaceOf: () => ({ Order() {} }),
		OverlayManager: {
			Register: rect => { const r = { rect, visible: false }; registrations.push(r); return r },
			Update: r => { r.visible = true }, Reset: r => { r.visible = false }, Raise: () => 1,
			TopUnderCursor: (x, y) => foreignOverlay ?? registrations.find(r => r.visible && r.rect.Contains(new Vector2(x, y)))
		}
	}
}
function load(filename, source = fs.readFileSync(path.join(__dirname, "..", filename), "utf8")) {
	const context = vm.createContext({ ...sdk, exports: {}, require: () => ({}) })
	vm.runInContext("Math.clamp = (x, a, b) => Math.min(b, Math.max(a, x))", context)
	vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context)
	return context.exports
}
const { SpellMenu } = load("src/menu/spells.ts")
const menu = Object.create(SpellMenu.prototype)
menu.HeroesMenu = new Map()
const hero = { Name: "test_hero", Index: 1, IsValid: true }
function ability(Name, AbilitySlot, IsUltimate = false) {
	return { Name, AbilitySlot, IsUltimate, Owner: hero, IsValid: true, ShouldBeDrawable: true, IsPassive: false, Level: 1, Cooldown: 0, TexturePath: Name }
}
const q = ability("q", 0), w = ability("w", 1), ult = ability("ult", 3, true)
ult.Cooldown = 40
const abilities = [ult, w, q]
/** The menu row as the store keeps it: the order is the priority, a move rebuilds the array. */
function selector() {
	const entry = { values: ["q", "w", "ult"], enabled: new Map([["q", false], ["w", false], ["ult", true]]) }
	return {
		entry,
		get values() { return entry.values },
		IsEnabled: name => entry.enabled.get(name) ?? false,
		GetPriority: name => entry.values.indexOf(name),
		MoveImage(from, to) {
			const values = entry.values.slice()
			const [moved] = values.splice(from, 1)
			values.splice(to, 0, moved)
			entry.values = values
			moves.push([from, to])
		}
	}
}
const ownSelector = selector()
menu.HeroesMenu.set(hero.Name, { hero, Abilities: ownSelector })
assert.equal(menu.SelectedAbility(hero, abilities), ult, "a single tile on pins the ability")
assert.equal(menu.ToggleAbility(hero, q), true)
assert.equal(ownSelector.IsEnabled("q"), true, "a flip turns the tile on")
assert.equal(menu.SelectedAbility(hero, abilities), undefined, "two tiles on pin nothing")
assert.equal(persisted, 1, "the flip goes through the persistent menu mutation")
assert.equal(marked, 1, "the flip dates the config")
assert.equal(menu.ToggleAbility(hero, q), true)
assert.equal(ownSelector.IsEnabled("q"), false, "a second flip turns it off")
assert.equal(menu.MoveAbility(hero, w, ult), true)
assert.deepEqual(ownSelector.values, ["q", "ult", "w"], "a move ranks the tile where the slot stood")
assert.deepEqual(moves, [[1, 2]], "the move goes through the row's own mutation")
assert.equal(menu.MoveAbility(hero, w, w), false, "a tile over its own slot moves nothing")
assert.equal(menu.MoveAbility(hero, ult, w), true)
assert.deepEqual(ownSelector.values, ["q", "w", "ult"])
const twin = { ...hero, Index: 2 }
const twinQ = { ...q, Owner: twin }
const twinSelector = selector()
menu.HeroesMenu.set(`${hero.Name}_2`, { hero: twin, Abilities: twinSelector })
assert.equal(menu.ToggleAbility(twin, twinQ), true)
assert.equal(twinSelector.IsEnabled("q"), true)
assert.equal(menu.ToggleAbility(hero, twinQ), false, "a matching name is not the same owner")
assert.equal(menu.MoveAbility(hero, q, twinQ), false, "another hero's ability is no slot of this row")
assert.equal(ownSelector.IsEnabled("q"), false)
assert.deepEqual(ownSelector.values, ["q", "w", "ult"])

const gui = fs.readFileSync(path.join(__dirname, "../src/gui.ts"), "utf8")
const begin = gui.indexOf("\tprivate getAbility(")
const end = gui.indexOf("\n\tprivate copyTo(", begin)
const { Tracker } = load("", `export class Tracker { player: any; ${gui.slice(begin, end)} }`)
const tracker = new Tracker()
tracker.player = { Hero: hero }
assert.equal(tracker.getAbility(abilities, menu), ult, "the pinned ultimate shows on cooldown")
ult.Cooldown = 0
assert.equal(tracker.getAbility(abilities, menu), undefined, "a ready pinned ability must not fall back")
assert.equal(tracker.getAbility(abilities, menu, false, true), ult, "ignoring cooldown reads the pinned one")
menu.ToggleAbility(hero, w)
w.Cooldown = 10
ult.Cooldown = 40
assert.equal(tracker.getAbility(abilities, menu), w, "the row's order ranks w before the ultimate")
assert.equal(tracker.getAbility(abilities, menu, true), ult, "only ultimate skips the rest")
menu.MoveAbility(hero, ult, q)
assert.deepEqual(ownSelector.values, ["ult", "q", "w"])
assert.equal(tracker.getAbility(abilities, menu), ult, "a drag to the front wins")
assert.equal(tracker.getAbility(abilities, menu, false, true, true), ult, "ignoring the ticks reads the order alone")
menu.ToggleAbility(hero, w)
w.Cooldown = 0
const passiveUlt = { ...ability("passive_ult", 5, true), IsPassive: true, Cooldown: 12 }
assert.equal(tracker.getAbility([w, passiveUlt], menu), passiveUlt, "a passive ultimate has no tile and counts as on")
menu.MoveAbility(hero, ult, w)
assert.deepEqual(ownSelector.values, ["q", "w", "ult"])

const { abilityPicker: picker } = load("src/abilityPicker.ts")
const anchor = new Rectangle(new Vector2(100, 30), new Vector2(124, 54))
function frame(list = abilities, include = true, advanceTweens = true) {
	now += 16
	draws.length = 0
	imageSlots.length = 0
	picker.BeginFrame()
	if (advanceTweens) sdk.MenuSDK.tickTweens()
	if (include) picker.Update(hero, list, anchor, menu)
	picker.EndFrame()
}
function press(p, button = 1) {
	sdk.InputManager.CursorOnScreen = p
	return events.MouseKeyDown(button)
}
function releaseAt(p, button = 1) {
	sdk.InputManager.CursorOnScreen = p
	return events.MouseKeyUp(button)
}
function click(p, button = 1) {
	const down = press(p, button)
	const up = releaseAt(p, button)
	assert.equal(up, down, "captured down and up must agree")
	return down
}
const tileOf = name => draws.find(x => x.texture === name)
const inside = tile => tile.position.Add(new Vector2(10, 10))
/** A frame after the card's reveal has run its course. */
function settle() {
	now += 200
	frame()
}
frame()
assert.equal(click(anchor.Center), false)
frame()
assert.deepEqual(draws.map(x => x.texture), ["q", "w", "ult"], "tiles follow the row's order")
assert.ok(tileOf("ult").alpha < 255, "the card comes up over a reveal")
settle()
assert.equal(tileOf("ult").alpha, 255, "a tile that is on is drawn whole")
assert.ok(tileOf("w").alpha < 255, "a tile that is off is dimmed")
assert.equal(click(inside(tileOf("w"))), false)
assert.equal(ownSelector.IsEnabled("w"), true, "a click turns the tile on")
assert.equal(registrations[0].visible, true, "the card stays open after a flip")
frame()
assert.equal(tileOf("w").alpha, 255)
assert.equal(click(inside(tileOf("w"))), false)
assert.equal(ownSelector.IsEnabled("w"), false, "a second click turns it off")
frame()
const stableSlots = imageSlots.slice()
assert.deepEqual(stableSlots, ["q", "w", "ult", "q", "w", "ult"], "both image layers are allocated before a drag")
const qSpot = inside(tileOf("q"))
const qStood = tileOf("q").position.x, wStood = tileOf("w").position.x
const ultGrab = inside(tileOf("ult"))
assert.equal(press(ultGrab), false)
frame()
assert.deepEqual(ownSelector.values, ["q", "w", "ult"], "a press alone moves nothing")
sdk.InputManager.CursorOnScreen = qSpot
frame()
assert.deepEqual(ownSelector.values, ["ult", "q", "w"], "carrying the tile over the first slot ranks it first")
assert.deepEqual(imageSlots, stableSlots, "reordering preserves every pooled image texture")
const held = draws[draws.length - 1]
assert.equal(held.texture, "ult", "the tile in hand is drawn over the rest")
assert.ok(held.side > 36, "the tile in hand is lifted")
assert.equal(tileOf("q").position.x, qStood, "a tile pushed aside starts out where it stood")
assert.equal(tileOf("w").position.x, wStood)
frame()
assert.deepEqual(ownSelector.values, ["ult", "q", "w"], "holding still moves nothing more")
assert.ok(tileOf("q").position.x > qStood, "and glides over to its new slot")
assert.ok(tileOf("w").position.x > wStood)
assert.equal(releaseAt(qSpot), false)
assert.equal(ownSelector.IsEnabled("ult"), true, "a drop does not flip the tile")
frame(abilities, true, false)
assert.deepEqual(imageSlots, stableSlots, "release preserves every pooled image texture during landing")
assert.equal(draws.length, 3, "each ability has only one visible image during landing")
assert.equal(draws[draws.length - 1].texture, "ult", "the landing tile stays above its neighbours")
frame()
assert.deepEqual(imageSlots, stableSlots, "finishing the landing preserves every pooled image texture")
assert.deepEqual(draws.slice().sort((a, b) => a.position.x - b.position.x).map(x => x.texture), ["ult", "q", "w"], "the settled positions follow priority")
// Grab the first pooled image next: lifting it must not shift every following image slot.
const secondGrab = inside(tileOf("q"))
const secondDrop = inside(tileOf("w"))
assert.equal(press(secondGrab), false)
sdk.InputManager.CursorOnScreen = secondDrop
frame()
assert.deepEqual(imageSlots, stableSlots, "lifting a different tile keeps both image layers stable")
assert.equal(draws[draws.length - 1].texture, "q", "the second dragged tile is above the grid")
assert.equal(releaseAt(secondDrop), false)
frame(abilities, true, false)
assert.deepEqual(imageSlots, stableSlots, "a second drop does not rebind any image")
frame()
assert.deepEqual(imageSlots, stableSlots, "the second landing keeps the same image slots")
menu.MoveAbility(hero, q, w)
menu.MoveAbility(hero, ult, w)
assert.equal(click(new Vector2(700, 700)), true, "outside clicks pass through")
assert.equal(registrations[0].visible, false)
click(anchor.Center); frame()
assert.equal(events.KeyDown(27), false)
assert.equal(registrations[0].visible, false, "escape closes the card")
click(anchor.Center); frame()
assert.equal(click(inside(tileOf("w")), 2), false)
assert.equal(registrations[0].visible, false, "a right click closes the card")
foreignOverlay = {}
assert.equal(click(anchor.Center), true, "another overlay owns overlapping input")
foreignOverlay = undefined
click(anchor.Center); frame()
sdk.MenuSDK.MenuManager.IsOpen = true
frame()
assert.equal(registrations[0].visible, true, "the card stands while the menu is open")
assert.equal(click(inside(tileOf("w"))), false, "a tile takes the click while the menu is open")
assert.equal(ownSelector.IsEnabled("w"), true)
click(inside(tileOf("w")))
sdk.MenuSDK.MenuManager.IsOpen = false
frame([], false)
assert.equal(registrations[0].visible, false, "removed hero closes popup and clears hit target")
assert.equal(click(anchor.Center), true)
frame(); click(anchor.Center); frame()
const qTile = tileOf("q")
q.IsValid = false
assert.equal(click(inside(qTile)), false)
assert.equal(ownSelector.IsEnabled("q"), false, "a stale ability cannot be flipped")
q.IsValid = true
anchor.pos1.SetVector(1900, 30); anchor.pos2.SetVector(1920, 54)
frame()
assert.ok(registrations[0].rect.Right <= 1920, "picker clamps to the viewport")
overlayAllowed = false
frame()
assert.equal(registrations[0].visible, false)
picker.Hide()
assert.equal(click(anchor.Center), true)
console.log("Ability picker: flips, ranking, ownership, priority lookup, drag and drop, click capture, open menu, dismissal, stale data and viewport checks passed.")
