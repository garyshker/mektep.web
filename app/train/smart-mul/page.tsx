'use client'

import { SmartTrainer } from '@/components/SmartTrainer'
import { MUL_LADDER, MUL_SKILL_LABEL, multiplicationOptions, genMultiplication, type MulSkill } from '@/lib/skills'

export default function SmartMulTrainer() {
  return (
    <SmartTrainer config={{
      titleKey: 'train_smart_mul',
      ladder: MUL_LADDER,
      skillLabel: MUL_SKILL_LABEL,
      gen: s => genMultiplication(s as MulSkill),
      options: multiplicationOptions,
      op: '×',
      helpSkill: 'mul_hard',
      helpTag: 'table_neighbor',
      helpHintKey: 'sm_help_mul',
    }} />
  )
}
