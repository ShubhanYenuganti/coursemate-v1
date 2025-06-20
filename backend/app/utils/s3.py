import boto3
from flask import current_app
import mimetypes

def get_s3_client():
    """Initializes and returns a boto3 S3 client from app config."""
    return boto3.client(
        's3',
        aws_access_key_id=current_app.config['S3_KEY'],
        aws_secret_access_key=current_app.config['S3_SECRET'],
        region_name=current_app.config['S3_REGION']
    )

def upload_file_to_s3(file_obj, s3_path):
    """
    Uploads a file object to a specified path in the S3 bucket.
    """
    s3 = get_s3_client()
    bucket_name = current_app.config['AWS_STORAGE_BUCKET_NAME']
    # Guess content type
    content_type, _ = mimetypes.guess_type(s3_path)
    extra_args = {'ACL': 'private', 'ContentDisposition': 'inline'}
    if content_type:
        extra_args['ContentType'] = content_type
    s3.upload_fileobj(
        file_obj,
        bucket_name,
        s3_path,
        ExtraArgs=extra_args
    )
    # Note: You might want a way to generate presigned URLs to access private files.
    # For now, we return the path. A separate endpoint can generate URLs.
    return s3_path

def list_files_in_s3(prefix):
    """
    Lists files in a given directory (prefix) in the S3 bucket.
    """
    s3 = get_s3_client()
    bucket_name = current_app.config['AWS_STORAGE_BUCKET_NAME']
    print(f"AWS_STORAGE_BUCKET_NAME config value: {bucket_name} (type: {type(bucket_name)})", flush=True)
    response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
    
    files = []
    if 'Contents' in response:
        for obj in response['Contents']:
            # Generate a presigned URL for temporary access
            url = s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': obj['Key'],
                    'ResponseContentDisposition': 'inline'
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )
            files.append({
                'key': obj['Key'],
                'url': url,
                'size': obj['Size'],
                'last_modified': obj['LastModified'].isoformat()
            })
    return files

def delete_file_from_s3(s3_path):
    """
    Deletes a file from a specified path in the S3 bucket.
    """
    s3 = get_s3_client()
    bucket_name = current_app.config['AWS_STORAGE_BUCKET_NAME']
    s3.delete_object(Bucket=bucket_name, Key=s3_path)
    return True 