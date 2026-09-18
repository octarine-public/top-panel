// AUTO-GENERATED - do not edit.
/**
 * The prediction core: one cast, placed and scored. The mode follows the profile in the input:
 * a unit target gets a timeline and a hit check, a shape gets placed on the target's predicted
 * position, cut to range, checked for collisions and scored by how much of the target's
 * reachable region it covers, an area around the caster asks who will be inside. Everything
 * the core needs about the world arrives in the input; it never looks entities up itself. Each
 * ability owns one core, which owns the estimates and points it works with.
 */
declare class CastPredictor {
	/** `HitChance` for a probability, by the tuned thresholds. */
	public static ChanceOf(probability: number): EHitChance
	public Predict(input: PredictionInput, out: PredictionOutput): PredictionOutput
	/**
	 * Fills `out.AoeTargets` with the candidates the shape covers when it lands, the target first.
	 * Exposed for strategies that place their own shape.
	 */
	public CollectCovered(input: PredictionInput, out: PredictionOutput): void
	/**
	 * Scores the placement in `out` against `target`: impossible when the effect cannot affect
	 * it when it lands, immobile when it cannot leave, otherwise the covered share of where it can
	 * be by then, cells it reaches sooner weighing more. Exposed for strategies.
	 */
	public Evaluate(input: PredictionInput, out: PredictionOutput, target: IPredictionTarget): void
	/** Whether the placement in `out` still covers a unit of hull `hull` standing at `position`. */
	public Covers(out: PredictionOutput, position: Vector3, hull: number): boolean
}
