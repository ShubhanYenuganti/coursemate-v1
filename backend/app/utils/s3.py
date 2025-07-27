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
    
    # Explicitly set content type for JSON files
    if s3_path.endswith('.json'):
        content_type = 'application/json'
    
    extra_args = {'ACL': 'private', 'ContentDisposition': 'inline'}
    if content_type:
        extra_args['ContentType'] = content_type
        
    print(f"DEBUG S3: Uploading {s3_path} with content type: {content_type}")
    
    s3.upload_fileobj(
        file_obj,
        bucket_name,
        s3_path,
        ExtraArgs=extra_args
    )
    # Note: You might want a way to generate presigned URLs to access private files.
    # For now, we return the path. A separate endpoint can generate URLs.
    return s3_path

def get_presigned_url(s3_key):
    """Generates a presigned URL for an S3 object."""
    s3 = get_s3_client()
    bucket_name = current_app.config['AWS_STORAGE_BUCKET_NAME']
    
    try:
        print(f"DEBUG S3: Generating presigned URL for key: {s3_key}")
        
        params = {
            'Bucket': bucket_name,
            'Key': s3_key,
            'ResponseContentDisposition': 'inline'
        }
        
        # Set content type for JSON files
        if s3_key.endswith('.json'):
            params['ResponseContentType'] = 'application/json'
            
        url = s3.generate_presigned_url(
            'get_object',
            Params=params,
            ExpiresIn=3600  # URL expires in 1 hour
        )
        print(f"DEBUG S3: Generated presigned URL: {url}")
        return url
    except Exception as e:
        print(f"Error generating presigned URL for {s3_key}: {e}")
        return None

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
            url = get_presigned_url(obj['Key'])
            
            if url:
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

def download_file_from_s3(s3_path):
    """
    Downloads a file from S3 and returns its content as a string.
    """
    try:
        s3 = get_s3_client()
        bucket_name = current_app.config['AWS_STORAGE_BUCKET_NAME']
        
        response = s3.get_object(Bucket=bucket_name, Key=s3_path)
        content = response['Body'].read().decode('utf-8')
        return content
    except Exception as e:
        print(f"Error downloading file from S3: {str(e)}")
        return None