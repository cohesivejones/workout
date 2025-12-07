import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('pain_scores')
@Unique(['userId', 'date'])
export class PainScore {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'integer' })
  score: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
