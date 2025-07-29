"""Add material sharing columns to users_messages

Revision ID: 50bccabe7863
Revises: ce04a240f8d5
Create Date: 2025-07-27 13:43:15.423681

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '50bccabe7863'
down_revision = 'ce04a240f8d5'
branch_labels = None
depends_on = None


def upgrade():
    # Add material sharing columns to users_messages table
    op.add_column('users_messages', sa.Column('message_type', sa.Enum('text', 'material_share', name='dm_message_type_enum'), nullable=True, default='text'))
    op.add_column('users_messages', sa.Column('material_id', sa.String(36), nullable=True))
    op.add_column('users_messages', sa.Column('material_preview', sa.JSON(), nullable=True))
    
    # Add foreign key constraint for material_id
    op.create_foreign_key(
        'fk_users_messages_material_id',
        'users_messages', 'user_course_materials',
        ['material_id'], ['id']
    )


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_users_messages_material_id', 'users_messages', type_='foreignkey')
    
    # Remove columns
    op.drop_column('users_messages', 'material_preview')
    op.drop_column('users_messages', 'material_id')
    op.drop_column('users_messages', 'message_type')
