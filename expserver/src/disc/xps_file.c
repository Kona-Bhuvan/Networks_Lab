#include "../xps.h"

void file_source_handler(void *ptr);
void file_source_close_handler(void *ptr);

xps_file_t *xps_file_create(xps_core_t *core, const char *file_path, int *error)
{
    assert(core != NULL);
    assert(file_path != NULL);

    *error = E_FAIL;
    /*check if file is inside the public directory*/
    char *resolved_path = realpath(file_path, NULL);
    /*find realpath of "../public"*/
    char *resolved_public = realpath("../public", NULL);

    if (resolved_path == NULL || resolved_public == NULL)
    {
        logger(LOG_ERROR, "xps_file_create()", "realpath() failed");
        *error = E_NOTFOUND;
        free(resolved_path);
        free(resolved_public);
        return NULL;
    }

    size_t public_len = strlen(resolved_public);
    if (strncmp(resolved_path, resolved_public, public_len) != 0)
    {
        logger(LOG_WARNING, "xps_file_create()", "file requested is outside of public directory");
        *error = E_PERMISSION;
        free(resolved_path);
        free(resolved_public);
        return NULL;
    }

    free(resolved_path);
    free(resolved_public);

    /*check if others have read permission*/
    struct stat file_stat;
    if (stat(file_path, &file_stat) != 0)
    {
        logger(LOG_ERROR, "xps_file_create()", "stat() failed");
        perror("Error message");
        *error = E_NOTFOUND;
        return NULL;
    }

    if (!(file_stat.st_mode & S_IROTH))
    {
        logger(LOG_WARNING, "xps_file_create()", "others do not have read permission");
        *error = E_PERMISSION;
        return NULL;
    }

    // Getting size of file from stat (already called above)
    long temp_size = file_stat.st_size;

    // Opening file
    FILE *file_struct = fopen(file_path, "rb");
    /*handle EACCES,ENOENT or any other error*/
    if (file_struct == NULL)
    {
        /*logs EACCES,ENOENT or any other error*/
        if (errno == EACCES)
        {
            logger(LOG_WARNING, "xps_file_create()", "file permission denied");
            *error = E_PERMISSION;
        }
        else if (errno == ENOENT)
        {
            logger(LOG_WARNING, "xps_file_create()", "file not found");
            *error = E_NOTFOUND;
        }
        else
        {
            logger(LOG_ERROR, "xps_file_create()", "fopen() failed");
            perror("Error message");
        }
        return NULL;
    }

    const char *mime_type = xps_get_mime(file_path);
    if (mime_type == NULL)
    {
        logger(LOG_WARNING, "xps_file_create()", "mime type not found");
        *error = E_NOTFOUND;
        fclose(file_struct);
        return NULL;
    }

    xps_file_t *file = (xps_file_t *)malloc(sizeof(xps_file_t));
    if (file == NULL)
    {
        logger(LOG_ERROR, "xps_file_create()", "malloc() failed for 'file'");
        fclose(file_struct);
        return NULL;
    }
    
    xps_pipe_source_t *source = xps_pipe_source_create((void *)file, file_source_handler, file_source_close_handler);

    if (source == NULL)
    {
        logger(LOG_ERROR, "xps_file_create()", "xps_pipe_source_create() failed");
        fclose(file_struct);
        free(file);
        return NULL;
    }

    source->ready = true;
    file->core = core;
    file->source = source;
    file->file_struct = file_struct;
    file->size = (size_t)temp_size;
    file->mime_type = mime_type;
    file->file_path = strdup(file_path);
    if(file->file_path == NULL)
    {
        logger(LOG_ERROR, "xps_file_create()", "strdup() failed for 'file_path'");
        fclose(file_struct);
        xps_pipe_source_destroy(source);
        free(file);
        return NULL;
    }

    *error = OK;

    logger(LOG_DEBUG, "xps_file_create()", "created file");

    return file;
}

void xps_file_destroy(xps_file_t *file)
{
    assert(file != NULL);

    free((void *)file->file_path);
    if (file->file_struct != NULL)
        fclose(file->file_struct);
    if (file->source != NULL)
        xps_pipe_source_destroy(file->source);
    free(file);

    logger(LOG_DEBUG, "xps_file_destroy()", "destroyed file struct");
}

void file_source_handler(void *ptr)
{
    assert(ptr != NULL);

    xps_pipe_source_t *source = ptr;
    xps_file_t *file = (xps_file_t *)source->ptr;
    assert(file != NULL);
    assert(file->file_struct != NULL);

    /*create buffer and handle any error*/
    xps_buffer_t *buff = xps_buffer_create(DEFAULT_PIPE_BUFF_THRESH, 0, NULL);
    if (buff == NULL)
    {
        logger(LOG_ERROR, "file_source_handler()", "xps_buffer_create() failed");
        return;
    }

    // Read from file
    size_t read_n = fread(buff->data, 1, buff->size, file->file_struct);
    buff->len = read_n;

    // Checking for read errors
    if (ferror(file->file_struct))
    {
        logger(LOG_ERROR, "file_source_handler()", "fread() failed");
        xps_buffer_destroy(buff);
        source->ready = false;
        return;
    }

    // If end of file reached
    if (read_n == 0 && feof(file->file_struct))
    {
        logger(LOG_INFO, "file_source_handler()", "end of file reached");
        xps_buffer_destroy(buff);
        source->ready = false;
        return;
    }

    xps_pipe_source_write(source, buff);
    xps_buffer_destroy(buff);
}

void file_source_close_handler(void *ptr)
{
    assert(ptr != NULL);
    xps_pipe_source_t *source = ptr;

    xps_file_t *file = (xps_file_t *)source->ptr;
    xps_file_destroy(file);
}