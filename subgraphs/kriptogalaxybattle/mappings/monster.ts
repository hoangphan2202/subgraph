import { BigInt } from "@graphprotocol/graph-ts";
import { MonsterCreated, Pregnant, Transfer } from "../generated/MonsterCore/MonsterCore";
import { Monster } from "../generated/schema";
import { cooldowns, fetchGeneTraits, getMonsterImage, ONE_BI, TWO_BI, ZERO_BI } from "./util";

let MAX_COOLDOWN_INDEX = BigInt.fromI32(13);
let SECONDS_PER_BLOCK = BigInt.fromI32(5);

export function handlePregnant(args: Pregnant): void {
  let matron = Monster.load(args.params.matronId.toString());
  // Mark the matron as pregnant, keeping track of who the sire is.
  matron.siringWithId = args.params.sireId;
  matron.save();

  _triggerCooldown(args, args.params.matronId.toString());
  _triggerCooldown(args, args.params.sireId.toString());
}

function _triggerCooldown(args: Pregnant, robotId: string): void {
  let m = Monster.load(robotId);
  m.cooldownEndBlock = cooldowns[m.cooldownIndex.toI32()].div(SECONDS_PER_BLOCK).plus(args.block.number);
  if (m.cooldownIndex.lt(MAX_COOLDOWN_INDEX)) {
    m.cooldownIndex = m.cooldownIndex.plus(ONE_BI);
  }
  m.save();
}

export function handleCreate(args: MonsterCreated): void {
  let monster = new Monster(args.params.monsterId.toString());
  monster.owner = args.params.owner;
  monster.cooldownEndBlock = ZERO_BI;
  monster.matronId = args.params.matronId;
  monster.sireId = args.params.sireId;
  monster.genes = args.params.genes.toHex();
  monster.siringWithId = ZERO_BI;
  monster.generation = ZERO_BI;
  monster.cooldownIndex = ZERO_BI;
  monster.name = "KABA Monster #" + monster.id;

  if (!monster.matronId.isZero()) {
    let matron = Monster.load(monster.matronId.toString());
    matron.siringWithId = ZERO_BI;
    matron.save();

    let sire = Monster.load(monster.sireId.toString());

    monster.generation = matron.generation;
    if (sire.generation > matron.generation) {
      monster.generation = sire.generation;
    }
    monster.generation = monster.generation.plus(ONE_BI);

    monster.cooldownIndex = monster.generation.div(TWO_BI);
    if (monster.cooldownIndex.gt(MAX_COOLDOWN_INDEX)) {
      monster.cooldownIndex = MAX_COOLDOWN_INDEX;
    }
  }

  let traits = fetchGeneTraits(args.params.genes);
  monster.gen0Rarity = BigInt.fromI32(1);
  monster.image = getMonsterImage(traits);
  monster.save();
}

export function handleTransfer(args: Transfer): void {
  let m = Monster.load(args.params.tokenId.toString());
  if (m) {
    m.owner = args.params.to;
    m.save();
  }
}
