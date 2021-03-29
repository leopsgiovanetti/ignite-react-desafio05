import { GetStaticPaths, GetStaticProps } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  const [timeToRead, setTimeToRead] = useState(0);

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  useEffect(() => {
    const wordsPerMinute = 200;

    const words = post?.data?.content?.reduce((totalWords, content) => {
      totalWords.push(...content.heading.split(' '));

      const bodyWords = RichText.asText(content.body)
        .replace(/[^\w|\s]/g, '')
        .split(' ');

      totalWords.push(...bodyWords);

      return totalWords;
    }, []);

    const time = Math.ceil(words.length / wordsPerMinute);
    setTimeToRead(time);
  }, []);

  return (
    <div className={commonStyles.container}>
      <Header />
      <img className={styles.banner} src={post?.data?.banner?.url} alt="" />
      <main className={commonStyles.content}>
        <article className={styles.post}>
          <div>
            <h1>{post?.data?.title}</h1>
            <div>
              <span>
                <FiCalendar />
                <time>
                  {format(
                    new Date(post?.first_publication_date),
                    'dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                </time>
              </span>
              <span>
                <FiUser /> {post?.data?.author}
              </span>
              <span>
                <FiClock /> {timeToRead} min
              </span>
              {post.data?.content?.map(part => {
                return (
                  <div key={part.heading}>
                    <h2>{part.heading}</h2>
                    <div
                      className={styles.content}
                      dangerouslySetInnerHTML={{
                        __html: RichText.asHtml(part.body)
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const response = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 2,
      fetch: ['posts.uid'],
    }
  );

  const paths = response.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });
  //  console.log('paths:', paths)

  return {
    paths,
    fallback: true,
  };

  // TODO
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});
  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  // console.log(JSON.stringify(response, null, 2))
  const contents = response.data.content.map(content => {
    return {
      heading: content.heading,
      body: RichText.asHtml(content.body),
    };
  });

  const post = {
    first_publication_date: response.first_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
  };
  // TODO
};
