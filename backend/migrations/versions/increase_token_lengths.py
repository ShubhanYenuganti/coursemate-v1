"""Increase token field lengths

Revision ID: 1234567890cd
Revises: 1234567890ab
Create Date: 2025-06-04 21:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1234567890cd'
down_revision = '1234567890ab'
branch_labels = None
depends_on = None

def upgrade():
    # Increase the length of token fields
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('email_verification_token', type_=sa.String(500), existing_nullable=True)
        batch_op.alter_column('password_reset_token', type_=sa.String(500), existing_nullable=True)

def downgrade():
    # Revert back to original lengths
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('email_verification_token', type_=sa.String(100), existing_nullable=True)
        batch_op.alter_column('password_reset_token', type_=sa.String(100), existing_nullable=True)
