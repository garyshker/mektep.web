'use client'

import { SmartTrainer } from '@/components/SmartTrainer'
import { DIV_LADDER, DIV_SKILL_LABEL, divisionOptions, genDivision, type DivSkill } from '@/lib/skills'

export default function SmartDivTrainer() {
  return (
    <SmartTrainer config={{
      titleKey: 'train_smart_div',
      ladder: DIV_LADDER,
      skillLabel: DIV_SKILL_LABEL,
      gen: s => genDivision(s as DivSkill),
      options: divisionOptions,
      op: '÷',
      helpSkill: 'div_hard',
      helpTag: 'gave_divisor',
      helpHintKey: 'sm_help_div',
    }} />
  )
}
