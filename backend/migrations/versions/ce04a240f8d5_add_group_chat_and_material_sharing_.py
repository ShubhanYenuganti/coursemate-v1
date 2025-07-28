"""Add group chat and material sharing models

Revision ID: ce04a240f8d5
Revises: 057d43985215
Create Date: 2025-07-27 13:37:45.523997

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ce04a240f8d5'
down_revision = '057d43985215'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum for message types in group chat
    op.execute("CREATE TYPE message_type_enum AS ENUM ('text', 'material_share', 'system')")
    
    # Create enum for member roles in group chat  
    op.execute("CREATE TYPE member_role_enum AS ENUM ('admin', 'member')")
    
    # Create enum for message types in direct messages
    op.execute("CREATE TYPE dm_message_type_enum AS ENUM ('text', 'material_share')")
    
    # Create chat_groups table
    op.create_table('chat_groups',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create chat_group_members table
    op.create_table('chat_group_members',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('group_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('admin', 'member', name='member_role_enum'), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['chat_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('group_id', 'user_id', name='unique_group_member')
    )
    
    # Create indexes for chat_group_members
    op.create_index(op.f('ix_chat_group_members_group_id'), 'chat_group_members', ['group_id'], unique=False)
    op.create_index(op.f('ix_chat_group_members_user_id'), 'chat_group_members', ['user_id'], unique=False)
    
    # Create chat_messages table
    op.create_table('chat_messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('group_id', sa.String(), nullable=False),
        sa.Column('sender_id', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('message_type', sa.Enum('text', 'material_share', 'system', name='message_type_enum'), nullable=True),
        sa.Column('material_id', sa.String(), nullable=True),
        sa.Column('material_preview', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['chat_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['material_id'], ['user_course_materials.id'], ),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for chat_messages
    op.create_index(op.f('ix_chat_messages_group_id'), 'chat_messages', ['group_id'], unique=False)
    op.create_index(op.f('ix_chat_messages_material_id'), 'chat_messages', ['material_id'], unique=False)
    op.create_index(op.f('ix_chat_messages_sender_id'), 'chat_messages', ['sender_id'], unique=False)
    
    # Add material sharing columns to users_messages table
    with op.batch_alter_table('users_messages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('message_type', sa.Enum('text', 'material_share', name='dm_message_type_enum'), nullable=True))
        batch_op.add_column(sa.Column('material_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('material_preview', sa.JSON(), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_messages_material_id'), ['material_id'], unique=False)
        batch_op.create_foreign_key('fk_users_messages_material', 'user_course_materials', ['material_id'], ['id'])


def downgrade():
    # Drop material sharing columns from users_messages
    with op.batch_alter_table('users_messages', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_messages_material', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_users_messages_material_id'))
        batch_op.drop_column('material_preview')
        batch_op.drop_column('material_id')
        batch_op.drop_column('message_type')
    
    # Drop chat_messages table
    op.drop_index(op.f('ix_chat_messages_sender_id'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_material_id'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_group_id'), table_name='chat_messages')
    op.drop_table('chat_messages')
    
    # Drop chat_group_members table
    op.drop_index(op.f('ix_chat_group_members_user_id'), table_name='chat_group_members')
    op.drop_index(op.f('ix_chat_group_members_group_id'), table_name='chat_group_members')
    op.drop_table('chat_group_members')
    
    # Drop chat_groups table
    op.drop_table('chat_groups')
    
    # Drop custom enums
    op.execute("DROP TYPE IF EXISTS dm_message_type_enum")
    op.execute("DROP TYPE IF EXISTS member_role_enum")
    op.execute("DROP TYPE IF EXISTS message_type_enum")
