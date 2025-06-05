"""Add email verification and password reset fields

Revision ID: 1234567890ab
Revises: 
Create Date: 2025-06-04 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '1234567890ab'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns for email verification
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('email_verification_token', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('email_verification_sent_at', sa.DateTime(), nullable=True))
    
    # Add new columns for password reset
    op.add_column('users', sa.Column('password_reset_token', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('password_reset_sent_at', sa.DateTime(), nullable=True))
    
    # Create indexes for better query performance
    op.create_index(op.f('ix_users_email_verification_token'), 'users', ['email_verification_token'], unique=True)
    op.create_index(op.f('ix_users_password_reset_token'), 'users', ['password_reset_token'], unique=True)

def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_users_password_reset_token'), table_name='users')
    op.drop_index(op.f('ix_users_email_verification_token'), table_name='users')
    
    # Drop columns
    op.drop_column('users', 'password_reset_sent_at')
    op.drop_column('users', 'password_reset_token')
    op.drop_column('users', 'email_verification_sent_at')
    op.drop_column('users', 'email_verification_token')
    op.drop_column('users', 'email_verified')
