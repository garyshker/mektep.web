'use client'

import { SmartTrainer } from '@/components/SmartTrainer'
import { SUB_LADDER, SUB_SKILL_LABEL, subtractionOptions, genSubtraction, type SubSkill } from '@/lib/skills'

export default function SmartSubTrainer() {
  return (
    <SmartTrainer config={{
      titleKey: 'train_smart_sub',
      ladder: SUB_LADDER,
      skillLabel: SUB_SKILL_LABEL,
      gen: s => genSubtraction(s as SubSkill),
      options: subtractionOptions,
      op: '-',
      helpSkill: 'sub_2d_borrow',
      helpTag: 'forgot_borrow',
      helpHintKey: 'sm_help_borrow',
    }} />
  )
}
