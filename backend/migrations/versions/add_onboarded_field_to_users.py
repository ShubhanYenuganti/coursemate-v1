"""Add onboarded field to users

Revision ID: 20240605_onboarded
Revises: 1234567890cd
Create Date: 2024-06-05

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20240605_onboarded'
down_revision = '1234567890cd'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('onboarded', sa.Boolean(), server_default='false', nullable=False))

def downgrade():
    op.drop_column('users', 'onboarded')
